interface Particle { x: number; y: number; vx: number; vy: number; life: number; color: string }
export class ParticleSystem {
  private items: Particle[] = [];
  emit(x: number, y: number, color: string, count = 12): void {
    for (let i = 0; i < count && this.items.length < 100; i++) {
      this.items.push({ x, y, vx: (Math.random() - .5) * 260, vy: (Math.random() - .7) * 240, life: .3 + Math.random() * .5, color });
    }
  }
  clear(): void { this.items.length = 0; }
  update(dt: number): void {
    this.items = this.items.filter(p => {
      p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 320 * dt;
      return p.life > 0;
    });
  }
  draw(ctx: CanvasRenderingContext2D): void {
    for (const p of this.items) {
      ctx.globalAlpha = Math.min(1, p.life * 2); ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, 4, 4);
    }
    ctx.globalAlpha = 1;
  }
}
