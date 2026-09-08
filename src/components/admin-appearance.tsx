"use client";
import {useState,useSyncExternalStore,type CSSProperties,type ReactNode} from 'react';
const defaults={start:'#f5f7fb',end:'#e1e9fa',angle:135,style:'gradient',radius:12,sidebar:'#111c36',sidebarText:'#d7dff4',primary:'#496be0',secondary:'#ffffff',accent:'#855dd2'};
const key='qb-admin-appearance';
const changeEvent='qb-admin-appearance-change';
let unsaved:string|null|undefined;
function subscribe(onChange:()=>void) {
  const sync=()=>{unsaved=undefined;onChange();};
  window.addEventListener(changeEvent,onChange);window.addEventListener('storage',sync);
  return()=>{window.removeEventListener(changeEvent,onChange);window.removeEventListener('storage',sync);};
}
function snapshot(){if(unsaved!==undefined)return unsaved;try{return localStorage.getItem(key);}catch{return null;}}
function parse(raw:string|null):typeof defaults|null {
  try {
    if(!raw)return null;
    // Preserve existing gradient settings when upgrading older saved palettes.
    const value={...defaults,...JSON.parse(raw)};
    if(!['start','end','sidebar','sidebarText','primary','secondary','accent'].every(k=>/^#[0-9a-f]{6}$/i.test(value[k])))return null;
    if(!Number.isFinite(value.angle)||value.angle<0||value.angle>360||!Number.isFinite(value.radius)||value.radius<0||value.radius>28||!['gradient','solid'].includes(value.style))return null;
    return value;
  }catch{return null;}
}
function useAppearance(){return parse(useSyncExternalStore(subscribe,snapshot,()=>null));}
function save(value:typeof defaults|null){
  const raw=value?JSON.stringify(value):null;let persisted=true;
  try{if(raw)localStorage.setItem(key,raw);else localStorage.removeItem(key);unsaved=undefined;}catch{unsaved=raw;persisted=false;}
  window.dispatchEvent(new Event(changeEvent));return persisted;
}
function foreground(hex:string){
  const rgb=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(v=>v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4);
  return rgb[0]*0.2126+rgb[1]*0.7152+rgb[2]*0.0722>0.179?'#111111':'#ffffff';
}
export function AppearanceShell({admin,children}:{admin:boolean;children:ReactNode}) {
  const saved=useAppearance();const value=admin?saved:null;
  const style=value?{
    background:value.style==='solid'?value.start:`linear-gradient(${value.angle}deg,${value.start},${value.end})`,
    '--admin-radius':`${value.radius}px`,'--admin-sidebar':value.sidebar,'--admin-sidebar-text':value.sidebarText,
    '--blue':value.primary,'--blue-dark':`color-mix(in srgb,${value.primary} 85%,black)`,
    '--admin-primary-text':foreground(value.primary),'--admin-secondary':value.secondary,'--admin-secondary-text':foreground(value.secondary),
    '--admin-accent':value.accent,'--admin-accent-text':foreground(value.accent),'--violet':value.accent,
  } as CSSProperties:undefined;
  return <div className="app-shell" data-admin-appearance={value?'custom':undefined} style={style}>{children}</div>;
}
export default function AdminAppearance() {
  const saved=useAppearance();const settings=saved??defaults;const [message,setMessage]=useState('');
  function update(next:typeof defaults){setMessage(save(next)?'Saved in this browser.':'Applied for this session. Browser storage is unavailable.');}
  function reset(){setMessage(save(null)?'Default appearance restored.':'Default restored for this session.');}
  const colors=[['start','Start color'],['end','End color'],['sidebar','Sidebar background'],['sidebarText','Sidebar text'],['primary','Primary color'],['secondary','Secondary color'],['accent','Accent color']] as const;
  return <details className="panel admin-appearance"><summary>Admin appearance (temporary)</summary><p>Experiment with your admin palette. Changes apply across admin pages in this browser.</p><div className="appearance-fields"><label>Background style<select value={settings.style} onChange={e=>update({...settings,style:e.target.value})}><option value="gradient">Gradient</option><option value="solid">Solid</option></select></label>{colors.map(([field,label])=><label key={field}>{label}<input type="color" aria-label={label} value={settings[field]} disabled={field==='end'&&settings.style==='solid'} onChange={e=>update({...settings,[field]:e.target.value})} /><small>{settings[field]}</small></label>)}<label>Gradient angle: {settings.angle}°<input type="range" min="0" max="360" value={settings.angle} disabled={settings.style==='solid'} onChange={e=>update({...settings,angle:Number(e.target.value)})} /></label><label>Corner radius: {settings.radius}px<input type="range" min="0" max="28" value={settings.radius} onChange={e=>update({...settings,radius:Number(e.target.value)})} /></label></div><div className="appearance-preview"><button className="primary-button" type="button">Primary preview</button><button className="secondary-button" type="button">Secondary preview</button><span className="appearance-accent">Accent preview</span></div><button className="secondary-button" onClick={reset}>Reset appearance</button><p role="status">{message || (saved?'Custom appearance enabled.':'Default appearance.')}</p></details>;
}
