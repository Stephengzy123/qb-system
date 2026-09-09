export const state={user:null,database:null,storage:true};
export async function getAppUser(){return state.user;}
export function getDatabase(){return state.database;}
export function getBrandingStorage(){return state.storage?{}:null;}
