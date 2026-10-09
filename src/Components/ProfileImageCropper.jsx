import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import "./ProfileImageCropper.css";

const OUTPUT_SIZE = 512;
const MIN_ZOOM = 1;
const MAX_ZOOM = 4;

export default function ProfileImageCropper({ file, onCancel, onCrop }) {
  const stageRef = useRef(null);
  const imageRef = useRef(null);
  const pointersRef = useRef(new Map());
  const dragRef = useRef(null);
  const pinchRef = useRef(null);
  const [imageUrl, setImageUrl] = useState("");
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [imageSize, setImageSize] = useState(null);
  const [isCropping, setIsCropping] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  const clampOffset = (nextOffset, nextZoom = zoom) => {
    if (!stageRef.current || !imageSize) return nextOffset;
    const stage = stageRef.current;
    const baseScale = Math.max(
      stage.clientWidth / imageSize.width,
      stage.clientHeight / imageSize.height,
    );
    const maxX = Math.max(0, (imageSize.width * baseScale * nextZoom - stage.clientWidth) / 2);
    const maxY = Math.max(0, (imageSize.height * baseScale * nextZoom - stage.clientHeight) / 2);
    return {
      x: Math.max(-maxX, Math.min(maxX, nextOffset.x)),
      y: Math.max(-maxY, Math.min(maxY, nextOffset.y)),
    };
  };

  const handlePointerDown = (event) => {
    if (!imageSize) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    pointersRef.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });

    if (pointersRef.current.size === 1) {
      dragRef.current = {
        pointerId: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        offset,
      };
    } else if (pointersRef.current.size === 2) {
      const [first, second] = [...pointersRef.current.values()];
      const midpoint = {
        x: (first.x + second.x) / 2,
        y: (first.y + second.y) / 2,
      };
      const rect = stageRef.current.getBoundingClientRect();
      const stage = stageRef.current;
      const baseScale = Math.max(
        stage.clientWidth / imageSize.width,
        stage.clientHeight / imageSize.height,
      );
      const imageScale = baseScale * zoom;
      pinchRef.current = {
        distance: Math.hypot(second.x - first.x, second.y - first.y),
        zoom,
        offset,
        focalX: (midpoint.x - rect.left - stage.clientWidth / 2 - offset.x) / imageScale,
        focalY: (midpoint.y - rect.top - stage.clientHeight / 2 - offset.y) / imageScale,
      };
      dragRef.current = null;
    }
  };

  const handlePointerMove = (event) => {
    if (!pointersRef.current.has(event.pointerId)) return;
    pointersRef.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });

    if (pointersRef.current.size >= 2 && pinchRef.current) {
      const [first, second] = [...pointersRef.current.values()];
      const midpoint = {
        x: (first.x + second.x) / 2,
        y: (first.y + second.y) / 2,
      };
      const rect = stageRef.current.getBoundingClientRect();
      const stage = stageRef.current;
      const pinch = pinchRef.current;
      const distance = Math.hypot(second.x - first.x, second.y - first.y);
      const nextZoom = Math.max(
        MIN_ZOOM,
        Math.min(MAX_ZOOM, pinch.zoom * (distance / pinch.distance)),
      );
      const baseScale = Math.max(
        stage.clientWidth / imageSize.width,
        stage.clientHeight / imageSize.height,
      );
      const nextOffset = {
        x:
          midpoint.x -
          rect.left -
          stage.clientWidth / 2 -
          pinch.focalX * baseScale * nextZoom,
        y:
          midpoint.y -
          rect.top -
          stage.clientHeight / 2 -
          pinch.focalY * baseScale * nextZoom,
      };
      setZoom(nextZoom);
      setOffset(clampOffset(nextOffset, nextZoom));
    } else if (dragRef.current?.pointerId === event.pointerId) {
      const drag = dragRef.current;
      setOffset(
        clampOffset({
          x: drag.offset.x + event.clientX - drag.x,
          y: drag.offset.y + event.clientY - drag.y,
        }),
      );
    }
  };

  const handlePointerUp = (event) => {
    pointersRef.current.delete(event.pointerId);
    pinchRef.current = null;
    dragRef.current = null;

    const remaining = [...pointersRef.current.entries()][0];
    if (remaining) {
      const [pointerId, point] = remaining;
      dragRef.current = {
        pointerId,
        x: point.x,
        y: point.y,
        offset,
      };
    }
  };

  const handleZoomChange = (event) => {
    const nextZoom = Number(event.target.value);
    setZoom(nextZoom);
    setOffset(clampOffset(offset, nextZoom));
  };

  const handleCrop = async () => {
    if (!imageRef.current || !stageRef.current || !imageSize) return;
    setIsCropping(true);
    setError("");

    try {
      const stage = stageRef.current;
      const baseScale = Math.max(
        stage.clientWidth / imageSize.width,
        stage.clientHeight / imageSize.height,
      );
      const imageScale = baseScale * zoom;
      const renderedWidth = imageSize.width * imageScale;
      const renderedHeight = imageSize.height * imageScale;
      const sourceX =
        ((renderedWidth - stage.clientWidth) / 2 - offset.x) / imageScale;
      const sourceY =
        ((renderedHeight - stage.clientHeight) / 2 - offset.y) / imageScale;
      const sourceSize = stage.clientWidth / imageScale;
      const canvas = document.createElement("canvas");
      canvas.width = OUTPUT_SIZE;
      canvas.height = OUTPUT_SIZE;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Image editing is not available.");
      context.drawImage(
        imageRef.current,
        sourceX,
        sourceY,
        sourceSize,
        sourceSize,
        0,
        0,
        OUTPUT_SIZE,
        OUTPUT_SIZE,
      );

      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob(
          (result) =>
            result
              ? resolve(result)
              : reject(new Error("Could not prepare this image.")),
          "image/jpeg",
          0.92,
        );
      });
      const name = file.name.replace(/\.[^.]+$/, "") || "profile-photo";
      onCrop(new File([blob], `${name}.jpg`, { type: "image/jpeg" }));
    } catch (cropError) {
      console.error("Could not crop profile photo:", cropError);
      setError(cropError.message || "Could not prepare this image.");
      setIsCropping(false);
    }
  };

  return (
    <div
      className="profile-cropper-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <section
        className="profile-cropper"
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-cropper-title"
      >
        <header className="profile-cropper-header">
          <div>
            <h2 id="profile-cropper-title">Adjust your photo</h2>
            <p>Drag to reposition, or pinch to zoom.</p>
          </div>
          <button
            type="button"
            className="profile-cropper-close"
            onClick={onCancel}
            aria-label="Cancel photo editing"
          >
            <X size={20} />
          </button>
        </header>

        <div
          ref={stageRef}
          className="profile-cropper-stage"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          {imageUrl && (
            <img
              ref={imageRef}
              src={imageUrl}
              alt="Photo crop preview"
              onLoad={(event) =>
                setImageSize({
                  width: event.currentTarget.naturalWidth,
                  height: event.currentTarget.naturalHeight,
                })
              }
              onError={() => setError("This image couldn't be opened.")}
              style={{
                transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${zoom})`,
              }}
            />
          )}
          <div className="profile-cropper-frame" aria-hidden="true" />
        </div>

        <label className="profile-cropper-zoom">
          <span>Zoom</span>
          <input
            type="range"
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step="0.01"
            value={zoom}
            onChange={handleZoomChange}
            aria-label="Zoom profile photo"
          />
        </label>
        {error && <p className="profile-cropper-error" role="alert">{error}</p>}

        <div className="profile-cropper-actions">
          <button type="button" onClick={onCancel} disabled={isCropping}>
            Cancel
          </button>
          <button
            type="button"
            className="profile-cropper-save"
            onClick={handleCrop}
            disabled={!imageSize || isCropping}
          >
            {isCropping ? "Preparing..." : "Use photo"}
          </button>
        </div>
      </section>
    </div>
  );
}
