"use client";

import React, { useEffect, useRef } from 'react';
import SignaturePad from 'signature_pad';

interface SignatureCanvasProps {
  onConfirm: (dataUrl: string) => void;
  onCancel: () => void;
  loading: boolean;
}

export default function SignatureCanvas({ onConfirm, onCancel, loading }: SignatureCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const padRef = useRef<SignaturePad | null>(null);
  const observerRef = useRef<ResizeObserver | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const pad = new SignaturePad(canvas, {
      minWidth: 0.5,
      maxWidth: 1.5,
      penColor: '#0033aa',
    });
    padRef.current = pad;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentRect.width || canvas.clientWidth;
        const height = entry.contentRect.height || canvas.clientHeight;
        const dpr = window.devicePixelRatio || 1;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.scale(dpr, dpr);
        pad.clear();
      }
    });

    resizeObserver.observe(canvas);
    observerRef.current = resizeObserver;

    return () => {
      if (observerRef.current) observerRef.current.disconnect();
      pad.off();
    };
  }, []);

  const handleClear = () => {
    if (padRef.current) padRef.current.clear();
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas || !padRef.current) return;
    if (padRef.current.isEmpty()) {
      alert('Por favor, assine na tela antes de enviar.');
      return;
    }
    
    let dataURL = '';
    try {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const w = canvas.width, h = canvas.height;
        const imgData = ctx.getImageData(0, 0, w, h);
        const data = imgData.data;
        let minX = w, maxX = 0, minY = h, maxY = 0, found = false;
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            if (data[(y * w + x) * 4 + 3] > 10) {
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
              found = true;
            }
          }
        }
        if (found) {
          const margin = 6;
          const cropX = Math.max(0, minX - margin);
          const cropY = Math.max(0, minY - margin);
          const cropW = Math.min(w - cropX, (maxX - minX) + margin * 2);
          const cropH = Math.min(h - cropY, (maxY - minY) + margin * 2);

          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = cropW;
          tempCanvas.height = cropH;
          const tempCtx = tempCanvas.getContext('2d');
          if (tempCtx) {
            tempCtx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
            dataURL = tempCanvas.toDataURL('image/png');
          } else {
            dataURL = canvas.toDataURL('image/png');
          }
        } else {
          dataURL = canvas.toDataURL('image/png');
        }
      } else {
        dataURL = canvas.toDataURL('image/png');
      }
    } catch (e) {
      dataURL = canvas.toDataURL('image/png');
    }

    if (!dataURL || dataURL === 'data:,') {
      alert('Por favor, assine na tela antes de enviar.');
      return;
    }

    onConfirm(dataURL);
  };

  return (
    <div className="bg-white border border-black/8 rounded-2xl p-6 shadow-sm w-full max-w-[650px] mx-auto animate-fadeIn">
      <div className="text-center mb-4">
        <h3 className="mt-0 text-xl font-bold mb-1 text-slate-800">Assine na Tela</h3>
        <p className="text-xs text-slate-500 m-0">
          Use o dedo ou caneta touch. Se preferir, vire o celular na horizontal.
        </p>
      </div>

      <canvas ref={canvasRef} className="border-2 border-slate-800 bg-white rounded-xl w-full h-[280px] cursor-crosshair touch-none"></canvas>

      <div className="flex gap-3 mt-4">
        <button
          onClick={handleSave}
          disabled={loading}
          className="flex-1 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-200 text-white font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all duration-200"
        >
          {loading ? (
            <span className="animate-spin-custom rounded-full h-4 w-4 border-2 border-white/30 border-t-white"></span>
          ) : (
            'Confirmar e Enviar Assinatura'
          )}
        </button>
        <button
          onClick={handleClear}
          disabled={loading}
          className="w-auto bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 py-3 px-5 rounded-xl font-semibold cursor-pointer transition-all duration-200"
        >
          Limpar
        </button>
        <button
          onClick={onCancel}
          disabled={loading}
          className="w-auto bg-red-500 hover:bg-red-600 disabled:bg-slate-200 text-white py-3 px-5 rounded-xl font-semibold cursor-pointer transition-all duration-200"
        >
          Voltar
        </button>
      </div>
    </div>
  );
}
