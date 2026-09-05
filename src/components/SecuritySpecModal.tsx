import React from 'react';
import { ShieldCheck, Lock, Database, Cpu, X } from 'lucide-react';

interface SecuritySpecModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
}

export function SecuritySpecModal({ isOpen, onClose, userId }: SecuritySpecModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-stone-50 border border-stone-200 rounded-3xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl text-stone-800 overflow-hidden">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-stone-200 bg-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-800">
              <ShieldCheck className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <h3 className="font-serif-title text-base font-bold text-stone-900">Security & Threat Modeling Architecture</h3>
              <p className="text-xs text-stone-500">OWASP Top 10 + LLM Threat Mitigation Matrix</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-stone-700 bg-stone-50">
          
          {/* 5 Threat Zones Summary Table */}
          <div>
            <h4 className="font-serif-title text-sm font-semibold text-stone-900 mb-2.5 flex items-center gap-2">
              <Lock className="w-4 h-4 text-emerald-700" />
              1. The 5 Threat Zones Mitigation Matrix
            </h4>
            <div className="border border-stone-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
              <table className="w-full text-left border-collapse">
                <thead className="bg-stone-100/75 text-[11px] text-stone-800 font-semibold">
                  <tr>
                    <th className="p-3 border-b border-stone-200">Threat Zone</th>
                    <th className="p-3 border-b border-stone-200">Primary Risk</th>
                    <th className="p-3 border-b border-stone-200">Countermeasure Implemented</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-[11px]">
                  <tr>
                    <td className="p-3 font-medium text-emerald-900">1. Input Surfaces</td>
                    <td className="p-3 text-stone-500">Untrusted payloads / XSS / Injection</td>
                    <td className="p-3 text-stone-700">Strict schema checks, defensive destructuring, safe React Markdown rendering.</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-medium text-amber-900">2. Planning & Reasoning</td>
                    <td className="p-3 text-stone-500">Indirect Prompt Injection / Jailbreak</td>
                    <td className="p-3 text-stone-700">Isolated system instruction boundaries; plain data encapsulation.</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-medium text-stone-900">3. Tool & Server Execution</td>
                    <td className="p-3 text-stone-500">Server crashes / Rate limits</td>
                    <td className="p-3 text-stone-700">Resilient Fallback Ladder (3.6 Flash &rarr; 3.1 Lite &rarr; Flash Latest &rarr; 3.7 Flash).</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-medium text-emerald-900">4. Memory & State</td>
                    <td className="p-3 text-stone-500">Cross-user data leak / multi-tenant bleed</td>
                    <td className="p-3 text-stone-700">Strict owner-bound Firestore security rules (<code className="text-emerald-800 bg-emerald-50 px-1 py-0.5 rounded">auth.uid == userId</code>).</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-medium text-stone-900">5. Inter-System Comms</td>
                    <td className="p-3 text-stone-500">Secret / API token exposure</td>
                    <td className="p-3 text-stone-700">Server-side proxy; zero frontend API key leakage; Secret Manager integration.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Active Firestore Isolation Rules */}
          <div>
            <h4 className="font-serif-title text-sm font-semibold text-stone-900 mb-2 flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-700" />
              2. Active Firestore Security Rules
            </h4>
            <div className="p-3.5 bg-stone-900 border border-stone-800 rounded-2xl font-mono text-[11px] text-emerald-300 overflow-x-auto leading-relaxed shadow-inner">
              <pre>{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;

      match /reflections/{reflectionId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }

      match /interactions/{interactionId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}`}</pre>
            </div>
            {userId && (
              <p className="text-[11px] text-stone-500 mt-1.5">
                Your authenticated partition: <span className="font-mono text-emerald-800 font-semibold">/users/{userId}/reflections/*</span>
              </p>
            )}
          </div>

          {/* Fallback Resilience */}
          <div>
            <h4 className="font-serif-title text-sm font-semibold text-stone-900 mb-2 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-amber-700" />
              3. Resilient Gemini Fallback Ladder
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center text-[11px]">
              <div className="p-3 rounded-xl bg-white border border-stone-200 shadow-2xs">
                <span className="block text-[10px] text-stone-500 mb-0.5">Primary</span>
                <span className="font-semibold text-emerald-900">gemini-3.6-flash</span>
              </div>
              <div className="p-3 rounded-xl bg-white border border-stone-200 shadow-2xs">
                <span className="block text-[10px] text-stone-500 mb-0.5">High-Availability</span>
                <span className="font-semibold text-amber-900">gemini-3.1-flash-lite</span>
              </div>
              <div className="p-3 rounded-xl bg-white border border-stone-200 shadow-2xs">
                <span className="block text-[10px] text-stone-500 mb-0.5">Dynamic Alias</span>
                <span className="font-semibold text-stone-800">gemini-flash-latest</span>
              </div>
              <div className="p-3 rounded-xl bg-white border border-stone-200 shadow-2xs">
                <span className="block text-[10px] text-stone-500 mb-0.5">Deep Reasoning</span>
                <span className="font-semibold text-emerald-800">gemini-3.7-flash</span>
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-white border-t border-stone-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-stone-50 text-xs font-semibold transition-all cursor-pointer shadow-xs"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
}
