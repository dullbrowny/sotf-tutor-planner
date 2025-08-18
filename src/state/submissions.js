// src/state/submissions.js
import { track } from '../lib/track.js';

const SUB_KEY = 'sof.submissions.v1';
const THR_KEY = 'sof.threads.v1';

function readJSON(k, fb){ try{ return JSON.parse(localStorage.getItem(k)||JSON.stringify(fb)); }catch{ return fb; } }
function writeJSON(k, v){ localStorage.setItem(k, JSON.stringify(v)); }
const uid = (p='id') => `${p}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,7)}`;

export function getSubmission(studentId, planId, sectionId){
  const idx = readJSON(SUB_KEY, {});
  return idx?.[studentId]?.[planId]?.[sectionId] || null;
}

function upsertSubmission(s){
  const idx = readJSON(SUB_KEY, {});
  idx[s.studentId] ||= {};
  idx[s.studentId][s.planId] ||= {};
  idx[s.studentId][s.planId][s.sectionId] = s;
  writeJSON(SUB_KEY, idx);
  return s;
}

export function saveDraft({ studentId, planId, sectionId, text, attachments=[] }){
  const existing = getSubmission(studentId, planId, sectionId);
  const now = Date.now();
  const s = {
    id: existing?.id || uid('sub'),
    studentId, planId, sectionId,
    text: text ?? existing?.text,
    attachments: attachments.length ? attachments : (existing?.attachments || []),
    status: existing?.status && existing.status !== 'accepted' ? existing.status : 'draft',
    createdAt: existing?.createdAt || now,
    updatedAt: now
  };
  track('submission.draft.saved', { studentId, planId, sectionId, ts: now });
  return upsertSubmission(s);
}

export function submitWork({ studentId, planId, sectionId }){
  const existing = getSubmission(studentId, planId, sectionId);
  if(!existing) return null;
  const now = Date.now();
  existing.status = 'submitted';
  existing.updatedAt = now;
  upsertSubmission(existing);
  track('submission.submitted', { studentId, planId, sectionId, ts: now });
  return existing;
}

export function addTeacherFeedback({ teacherId, studentId, planId, sectionId, feedback, status='returned'|'accepted' }){
  const s = getSubmission(studentId, planId, sectionId);
  if(!s) return null;
  const now = Date.now();
  s.teacherFeedback = feedback;
  s.status = status;
  s.reviewedAt = now;
  upsertSubmission(s);
  track('submission.reviewed', { teacherId, studentId, planId, sectionId, status, ts: now });
  return s;
}

// Threads (clarifications)
export function listMessages(planId, sectionId){
  const idx = readJSON(THR_KEY, {});
  return idx[`${planId}:${sectionId}`] || [];
}
export function postMessage({ role, text, attachmentIds=[], studentId, teacherId, planId, sectionId }){
  const idx = readJSON(THR_KEY, {});
  const key = `${planId}:${sectionId}`;
  const msg = { id: uid('msg'), planId, sectionId, role, text, attachmentIds, studentId, teacherId, ts: Date.now() };
  idx[key] = [ ...(idx[key]||[]), msg ];
  writeJSON(THR_KEY, idx);
  track(role==='student' ? 'clarification.requested' : 'clarification.replied', { planId, sectionId, role, ts: msg.ts });
  return msg;
}

// Teacher queries (for Responses tab, inbox)
export function listSubmissionsForPlan(planId){
  const idx = readJSON(SUB_KEY, {});
  const out = [];
  for(const studentId of Object.keys(idx)){
    const perStudent = idx[studentId]?.[planId] || {};
    for(const sectionId of Object.keys(perStudent)){
      out.push(perStudent[sectionId]);
    }
  }
  return out;
}

