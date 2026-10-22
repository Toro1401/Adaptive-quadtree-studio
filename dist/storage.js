(function(){
  const DB_NAME='adaptive-pixel-studio',STORE='studies',VERSION=1;
  class StudyStorage{
    constructor(){this.dbPromise=null;this.memory=[]}
    open(){
      if(this.dbPromise)return this.dbPromise;
      this.dbPromise=new Promise((resolve,reject)=>{if(!('indexedDB'in window)){resolve(null);return}const request=indexedDB.open(DB_NAME,VERSION);request.onupgradeneeded=()=>{const db=request.result;if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE,{keyPath:'id',autoIncrement:true})};request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)}).catch(()=>null);return this.dbPromise;
    }
    async save(study){const db=await this.open(),record={...study,updatedAt:Date.now()};if(!db){if(!record.id)record.id=Date.now();const i=this.memory.findIndex(x=>x.id===record.id);if(i>=0)this.memory[i]=record;else this.memory.push(record);return record.id}return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite'),req=tx.objectStore(STORE).put(record);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}
    async list(){const db=await this.open();if(!db)return [...this.memory].sort((a,b)=>b.updatedAt-a.updatedAt);return new Promise((resolve,reject)=>{const req=db.transaction(STORE).objectStore(STORE).getAll();req.onsuccess=()=>resolve(req.result.sort((a,b)=>b.updatedAt-a.updatedAt));req.onerror=()=>reject(req.error)})}
    async get(id){const db=await this.open();if(!db)return this.memory.find(x=>x.id===id);return new Promise((resolve,reject)=>{const req=db.transaction(STORE).objectStore(STORE).get(Number(id));req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}
    async remove(id){const db=await this.open();if(!db){this.memory=this.memory.filter(x=>x.id!==id);return}return new Promise((resolve,reject)=>{const req=db.transaction(STORE,'readwrite').objectStore(STORE).delete(Number(id));req.onsuccess=()=>resolve();req.onerror=()=>reject(req.error)})}
  }
  window.studyStorage=new StudyStorage();
})();
