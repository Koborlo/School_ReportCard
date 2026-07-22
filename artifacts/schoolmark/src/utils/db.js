// src/utils/db.js — FIXED: all Firestore paths use odd segment counts
import {
  doc, getDoc, getDocs, setDoc, deleteDoc,
  collection, query, where, onSnapshot,
  serverTimestamp, writeBatch, orderBy,
} from "firebase/firestore";import { db } from "../firebase";

function safeKey(...parts) {
  return parts.map(p => String(p).replace(/[^a-zA-Z0-9]/g,"_")).join("__");
}
export function makeTermId(year, term) { return safeKey(year, term); }

// 3-segment collection paths ✓
function marksCol(t,c,s){return collection(db,"marksData",safeKey(t,c,s),"entries");}
function marksDoc(t,c,s,id){return doc(db,"marksData",safeKey(t,c,s),"entries",id);}
function studentsCol(t,c){return collection(db,"students",safeKey(t,c),"list");}
function studentDoc(t,c,id){return doc(db,"students",safeKey(t,c),"list",id);}

export async function getSettings(){try{const s=await getDoc(doc(db,"settings","school"));return s.exists()?s.data():null;}catch(e){return null;}}
export async function saveSettings(data){await setDoc(doc(db,"settings","school"),{...data,updatedAt:serverTimestamp()},{merge:true});}
export async function getSubjects(){try{const s=await getDoc(doc(db,"settings","subjects"));return s.exists()?s.data().list:null;}catch(e){return null;}}
export async function saveSubjects(list){await setDoc(doc(db,"settings","subjects"),{list,updatedAt:serverTimestamp()});}
export async function getUser(uid){try{const s=await getDoc(doc(db,"users",uid));return s.exists()?{uid,...s.data()}:null;}catch(e){return null;}}
export async function saveUser(uid,data){await setDoc(doc(db,"users",uid),{...data,updatedAt:serverTimestamp()},{merge:true});}
export async function getAllTeachers(){try{const s=await getDocs(collection(db,"users"));return s.docs.map(d=>({uid:d.id,...d.data()}));}catch(e){return[];}}
export async function deleteUser(uid){await deleteDoc(doc(db,"users",uid));}

export async function getTerms(){
  try{const s=await getDocs(collection(db,"terms"));
  return s.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.createdAt||"").localeCompare(a.createdAt||""));}
  catch(e){return[];}
}
export async function saveTerm(id,data){await setDoc(doc(db,"terms",id),{...data,updatedAt:serverTimestamp()},{merge:true});}
export async function getActiveTerm(){
  try{const s=await getDocs(query(collection(db,"terms"),where("active","==",true)));
  if(s.empty)return null;const d=s.docs[0];return{id:d.id,...d.data()};}
  catch(e){return null;}
}

export async function getStudents(termId,classCode){
  try{const s=await getDocs(query(studentsCol(termId,classCode),orderBy("name")));
  return s.docs.map(d=>({id:d.id,...d.data()}));}catch(e){console.error("getStudents:",e);return[];}
}
export async function saveStudents(termId,classCode,students){
  const b=writeBatch(db);
  students.forEach(s=>b.set(studentDoc(termId,classCode,s.id),{name:s.name,index:s.index},{merge:true}));
  await b.commit();
}
export async function deleteStudent(termId,classCode,studentId){await deleteDoc(studentDoc(termId,classCode,studentId));}
export async function deleteAllStudents(termId,classCode){
  try{const sts=await getStudents(termId,classCode);
  const b=writeBatch(db);
  sts.forEach(s=>b.delete(studentDoc(termId,classCode,s.id)));
  await b.commit();
  return true;}catch(e){console.error("deleteAllStudents:",e);return false;}
}

export async function getMarks(termId,classCode,subjectCode){
  try{const s=await getDocs(marksCol(termId,classCode,subjectCode));
  const r={};s.docs.forEach(d=>{r[d.id]=d.data();});return r;}
  catch(e){console.error("getMarks:",e);return{};}
}
export function subscribeMarks(termId,classCode,subjectCode,callback){
  try{return onSnapshot(marksCol(termId,classCode,subjectCode),
    s=>{const r={};s.docs.forEach(d=>{r[d.id]=d.data();});callback(r);},
    e=>{console.error("subscribeMarks:",e);callback({});});}
  catch(e){console.error("subscribeMarks setup:",e);callback({});return()=>{};}
}
export async function saveMark(termId,classCode,subjectCode,studentId,markData){
  await setDoc(marksDoc(termId,classCode,subjectCode,studentId),{...markData,updatedAt:serverTimestamp()},{merge:true});
}
export async function getAllMarksForClass(termId,classCode,subjectCodes){
  const r={};
  await Promise.all(subjectCodes.map(async sc=>{r[sc]=await getMarks(termId,classCode,sc);}));
  return r;
}
export async function getCompletionStats(termId,subjects,classes){
  const stats={};
  await Promise.all(classes.map(async cls=>{
    stats[cls.code]={};
    await Promise.all(subjects.map(async subj=>{
      const m=await getMarks(termId,cls.code,subj.code);
      const f=Object.values(m).filter(x=>x.t1!==undefined&&x.t1!==""&&x.ex!==undefined&&x.ex!=="").length;
      stats[cls.code][subj.code]={filled:f,total:Object.keys(m).length};
    }));
  }));
  return stats;
}
