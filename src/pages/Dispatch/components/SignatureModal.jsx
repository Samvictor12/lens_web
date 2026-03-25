import { useEffect, useRef, useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PenLine, RotateCcw, CheckCircle } from "lucide-react";

/**
 * Signature capture modal using HTML5 canvas.
 * No external dependencies — vanilla touch + mouse drawing.
 *
 * Props:
 *   open          — boolean
 *   onClose       — () => void
 *   onConfirm     — (signatureBase64: string) => void
 *   customerName  — string (shown in header)
 *   orderCount    — number (shown in header)
 *   isSaving      — boolean (disable confirm while uploading)
 */
export default function SignatureModal({ open, onClose, onConfirm, customerName, orderCount, isSaving }) {
    const canvasRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasSigned, setHasSigned] = useState(false);
    const lastPos = useRef(null);

    // Reset canvas when modal opens
    useEffect(() => {
        if (open) {
            setTimeout(() => clearCanvas(), 50);
        }
    }, [open]);

    const getPos = (e, canvas) => {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        if (e.touches) {
            const t = e.touches[0];
            return { x: (t.clientX - rect.left) * scaleX, y: (t.clientY - rect.top) * scaleY };
        }
        return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
    };

    const startDrawing = (e) => {
        e.preventDefault();
        setIsDrawing(true);
        lastPos.current = getPos(e, canvasRef.current);
    };

    const draw = (e) => {
        if (!isDrawing) return;
        e.preventDefault();
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        const pos = getPos(e, canvas);
        ctx.beginPath();
        ctx.moveTo(lastPos.current.x, lastPos.current.y);
        ctx.lineTo(pos.x, pos.y);
        ctx.strokeStyle = "#000";
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.stroke();
        lastPos.current = pos;
        setHasSigned(true);
    };

    const stopDrawing = (e) => {
        e?.preventDefault();
        setIsDrawing(false);
        lastPos.current = null;
    };

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setHasSigned(false);
    };

    const handleConfirm = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const signature = canvas.toDataURL("image/png");
        onConfirm(signature);
    };

    return (
        <Dialog open={open} onOpenChange={(v) => { if (!v && !isSaving) onClose(); }}>
            <DialogContent className="sm:max-w-lg w-full">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <PenLine className="h-4 w-4" />
                        Customer Signature
                    </DialogTitle>
                    {customerName && (
                        <p className="text-sm text-muted-foreground">
                            Delivering <span className="font-semibold text-foreground">{orderCount} order{orderCount !== 1 ? "s" : ""}</span> to{" "}
                            <span className="font-semibold text-foreground">{customerName}</span>
                        </p>
                    )}
                </DialogHeader>

                <div className="flex flex-col gap-3">
                    <p className="text-xs text-muted-foreground">
                        Ask the customer to sign below to confirm receipt of their order(s).
                    </p>

                    {/* Signature canvas */}
                    <div className="relative border-2 border-dashed border-border rounded-lg overflow-hidden bg-white aspect-[3/1] w-full touch-none">
                        <canvas
                            ref={canvasRef}
                            width={600}
                            height={200}
                            className="w-full h-full cursor-crosshair"
                            onMouseDown={startDrawing}
                            onMouseMove={draw}
                            onMouseUp={stopDrawing}
                            onMouseLeave={stopDrawing}
                            onTouchStart={startDrawing}
                            onTouchMove={draw}
                            onTouchEnd={stopDrawing}
                        />
                        {!hasSigned && (
                            <p className="absolute inset-0 flex items-center justify-center text-muted-foreground/50 text-sm pointer-events-none select-none">
                                Sign here
                            </p>
                        )}
                    </div>

                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="self-start gap-1.5 text-muted-foreground"
                        onClick={clearCanvas}
                        disabled={isSaving}
                    >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Clear Signature
                    </Button>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="outline" onClick={onClose} disabled={isSaving}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={!hasSigned || isSaving}
                        className="gap-1.5"
                    >
                        {isSaving ? (
                            <>
                                <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <CheckCircle className="h-4 w-4" />
                                Confirm Delivery
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
