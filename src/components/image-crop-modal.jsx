import React, { useCallback, useState } from 'react';
import Cropper from 'react-easy-crop';
import { X } from 'lucide-react';

// Returns a cropped image as a Blob, using the pixel crop rect from react-easy-crop
async function getCroppedBlob(imageSrc, pixelCrop, outputWidth = 600, outputHeight = 800) {
  const image = await new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = imageSrc;
  });

  const canvas = document.createElement('canvas');
  canvas.width = outputWidth;
  canvas.height = outputHeight;
  const ctx = canvas.getContext('2d');

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    outputWidth,
    outputHeight
  );

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.9);
  });
}

const ASPECT = 3 / 4; // 3:4 portrait (matches modifier card aspect)

export default function ImageCropModal({ isOpen, imageSrc, originalFileName, onCancel, onConfirm }) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [processing, setProcessing] = useState(false);

  const onCropComplete = useCallback((_, croppedPixels) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handleConfirm = async () => {
    if (!croppedAreaPixels) return;
    setProcessing(true);
    try {
      const blob = await getCroppedBlob(imageSrc, croppedAreaPixels);
      const baseName = (originalFileName || 'cropped').replace(/\.[^.]+$/, '');
      const file = new File([blob], `${baseName}.jpg`, { type: 'image/jpeg' });
      onConfirm(file);
    } finally {
      setProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4">
      <div className="bg-white rounded-lg w-full max-w-md shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-[var(--sf-border-light)]">
          <h3 className="font-semibold text-[var(--sf-text-primary)]" style={{ fontFamily: 'Montserrat', fontWeight: 600 }}>
            Crop image (3:4)
          </h3>
          <button
            type="button"
            onClick={onCancel}
            className="p-1 rounded hover:bg-[var(--sf-bg-hover)]"
            aria-label="Cancel crop"
          >
            <X className="w-5 h-5 text-[var(--sf-text-muted)]" />
          </button>
        </div>

        <div className="relative bg-black" style={{ aspectRatio: '3 / 4', maxHeight: '60vh' }}>
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={ASPECT}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            objectFit="horizontal-cover"
            showGrid={true}
          />
        </div>

        <div className="p-4 space-y-3">
          <div className="flex items-center gap-3">
            <label className="text-sm text-[var(--sf-text-secondary)] w-12" style={{ fontFamily: 'Montserrat', fontWeight: 500 }}>
              Zoom
            </label>
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-1"
            />
          </div>
          <p className="text-xs text-[var(--sf-text-muted)]" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>
            Drag the image to reposition. Scroll or use the slider to zoom.
          </p>
        </div>

        <div className="flex justify-end gap-2 p-4 border-t border-[var(--sf-border-light)]">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm rounded-lg hover:bg-[var(--sf-bg-hover)] text-[var(--sf-text-primary)]"
            style={{ fontFamily: 'Montserrat', fontWeight: 500 }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!croppedAreaPixels || processing}
            className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ fontFamily: 'Montserrat', fontWeight: 500 }}
          >
            {processing ? 'Processing…' : 'Use this crop'}
          </button>
        </div>
      </div>
    </div>
  );
}
