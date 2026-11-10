/* ==========================================================================
   ORBIT INTERACTIVE COSMIC CANVAS ENGINE
   ========================================================================== */

(function () {
    const canvas = document.getElementById('orbit-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let width, height;
    let particles = [];
    let mouse = { x: null, y: null, radius: 150 };

    function resize() {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
        initParticles();
    }

    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', (e) => {
        mouse.x = e.x;
        mouse.y = e.y;
    });
    window.addEventListener('mouseleave', () => {
        mouse.x = null;
        mouse.y = null;
    });

    class Particle {
        constructor() {
            this.x = Math.random() * width;
            this.y = Math.random() * height;
            this.size = Math.random() * 2 + 0.5;
            this.baseX = this.x;
            this.baseY = this.y;
            this.speedX = (Math.random() - 0.5) * 0.4;
            this.speedY = (Math.random() - 0.5) * 0.4;
            this.color = Math.random() > 0.4 ? '#00F0FF' : (Math.random() > 0.5 ? '#7000FF' : '#FF007A');
            this.alpha = Math.random() * 0.7 + 0.2;
        }

        draw() {
            ctx.save();
            ctx.globalAlpha = this.alpha;
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        update() {
            this.x += this.speedX;
            this.y += this.speedY;

            if (this.x < 0 || this.x > width) this.speedX *= -1;
            if (this.y < 0 || this.y > height) this.speedY *= -1;

            // Interactive mouse repelling / attraction
            if (mouse.x !== null) {
                let dx = mouse.x - this.x;
                let dy = mouse.y - this.y;
                let distance = Math.sqrt(dx * dx + dy * dy);
                if (distance < mouse.radius) {
                    let force = (mouse.radius - distance) / mouse.radius;
                    let angle = Math.atan2(dy, dx);
                    this.x -= Math.cos(angle) * force * 3;
                    this.y -= Math.sin(angle) * force * 3;
                }
            }
        }
    }

    function initParticles() {
        particles = [];
        const count = Math.min(Math.floor((width * height) / 12000), 120);
        for (let i = 0; i < count; i++) {
            particles.push(new Particle());
        }
    }

    let angle = 0;
    function animate() {
        ctx.clearRect(0, 0, width, height);

        // Draw Subtle Center Orbital Ring System
        const centerX = width / 2;
        const centerY = height / 3;

        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(angle);

        // Ring 1 (Cyan)
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.08)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(0, 0, 320, 180, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Ring 2 (Purple)
        ctx.strokeStyle = 'rgba(112, 0, 255, 0.06)';
        ctx.beginPath();
        ctx.ellipse(0, 0, 480, 260, 0.5, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();
        angle += 0.001;

        // Draw and Update Particles
        particles.forEach(p => {
            p.update();
            p.draw();
        });

        requestAnimationFrame(animate);
    }

    resize();
    animate();
})();
