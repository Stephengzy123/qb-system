"use client";
import {useEffect,useState} from 'react';
const defaults={start:'#f5f7fb',end:'#e1e9fa',angle:135,style:'gradient',radius:12};
const key='qb-admin-appearance';
function valid(value:unknown):value is typeof defaults {
  const v=value as typeof defaults|null;
  return !!v && /^#[0-9a-f]{6}$/i.test(v.start) && /^#[0-9a-f]{6}$/i.test(v.end) && Number.isFinite(v.angle) && v.angle>=0 && v.angle<=360 && Number.isFinite(v.radius) && v.radius>=0 && v.radius<=28 && ['gradient','solid'].includes(v.style);
}
export default function AdminAppearance() {
  const [settings,setSettings]=useState(defaults);const [enabled,setEnabled]=useState(false);const [message,setMessage]=useState('');
  useEffect(()=>{
    const shell=document.querySelector<HTMLElement>('.app-shell');
    try {const saved=JSON.parse(localStorage.getItem(key)??'null');if(valid(saved)) apply(saved);}catch{/* Default appearance when storage is unavailable. */}
    function apply(value:typeof defaults){if(!shell)return;shell.style.background=value.style==='solid'?value.start:`linear-gradient(${value.angle}deg,${value.start},${value.end})`;shell.style.setProperty('--admin-radius',`${value.radius}px`);}
    return()=>{if(shell){shell.style.background='';shell.style.removeProperty('--admin-radius');}};
  },[]);
  function update(next:typeof defaults) {
    setSettings(next);setEnabled(true);
    const shell=document.querySelector<HTMLElement>('.app-shell');
    if(shell){shell.style.background=next.style==='solid'?next.start:`linear-gradient(${next.angle}deg,${next.start},${next.end})`;shell.style.setProperty('--admin-radius',`${next.radius}px`);}
    try{localStorage.setItem(key,JSON.stringify(next));setMessage('Saved in this browser.');}catch{setMessage('Applied for this page. Browser storage is unavailable.');}
  }
  function open() {
    try{const saved=JSON.parse(localStorage.getItem(key)??'null');if(valid(saved)){setSettings(saved);setEnabled(true);}}catch{/* Defaults remain editable. */}
  }
  function reset(){const shell=document.querySelector<HTMLElement>('.app-shell');if(shell){shell.style.background='';shell.style.removeProperty('--admin-radius');}setSettings(defaults);setEnabled(false);try{localStorage.removeItem(key);setMessage('Default appearance restored.');}catch{setMessage('Default restored for this page.');}}
  return <details className="panel admin-appearance" onToggle={event=>{if(event.currentTarget.open)open();}}><summary>Admin appearance (temporary)</summary><p>Customize your admin workspace in this browser.</p><div className="appearance-fields"><label>Background style<select value={settings.style} onChange={e=>update({...settings,style:e.target.value})}><option value="gradient">Gradient</option><option value="solid">Solid</option></select></label><label>Start color<input type="color" value={settings.start} onChange={e=>update({...settings,start:e.target.value})} /></label><label>End color<input type="color" disabled={settings.style==='solid'} value={settings.end} onChange={e=>update({...settings,end:e.target.value})} /></label><label>Gradient angle: {settings.angle}°<input type="range" min="0" max="360" value={settings.angle} disabled={settings.style==='solid'} onChange={e=>update({...settings,angle:Number(e.target.value)})} /></label><label>Corner radius: {settings.radius}px<input type="range" min="0" max="28" value={settings.radius} onChange={e=>update({...settings,radius:Number(e.target.value)})} /></label></div><button className="secondary-button" onClick={reset}>Reset appearance</button><p role="status">{message || (enabled?'Custom appearance enabled.':'Default appearance.')}</p></details>;
}
