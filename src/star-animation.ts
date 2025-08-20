import { Star } from "./types";

export const initializeStars = (): Star[] => {
  return Array.from({ length: 80 }, () => ({
    x: Math.random() * window.innerWidth,
    y: Math.random() * window.innerHeight,
    opacity: 0.2 + Math.random() * 0.3,
    baseOpacity: 0.2 + Math.random() * 0.3,
    twinklePhase: Math.random() * Math.PI * 2,
  }));
};

export const drawStars = (canvas: HTMLCanvasElement | null, stars: Star[]): void => {
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  stars.forEach((star) => {
    star.twinklePhase += 0.02;
    star.opacity = star.baseOpacity + Math.sin(star.twinklePhase) * 0.1;
    ctx.globalAlpha = star.opacity;
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.arc(star.x, star.y, 1, 0, Math.PI * 2);
    ctx.fill();
  });
};