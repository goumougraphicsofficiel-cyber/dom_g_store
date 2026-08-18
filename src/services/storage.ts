const PREFIX='dgs:v2:'
const LEGACY_PREFIX='dgs:v1:'

if(typeof window!=='undefined'&&!localStorage.getItem(`${PREFIX}initialized`)){
 Object.keys(localStorage).filter(key=>key.startsWith(LEGACY_PREFIX)).forEach(key=>localStorage.removeItem(key))
 localStorage.setItem(`${PREFIX}initialized`,'true')
}

export const storage={
 get<T>(key:string,fallback:T):T{try{const raw=localStorage.getItem(`${PREFIX}${key}`);return raw?JSON.parse(raw) as T:fallback}catch{return fallback}},
 set<T>(key:string,value:T){localStorage.setItem(`${PREFIX}${key}`,JSON.stringify(value))},
 remove(key:string){localStorage.removeItem(`${PREFIX}${key}`)}
}
