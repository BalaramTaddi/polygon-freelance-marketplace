import React, { useEffect, useRef } from 'react';
import { useAnimeAnimations } from '../hooks/useAnimeAnimations';
import { Sparkles, Zap, Layers, MousePointer, Eye, Code } from 'lucide-react';
import { remove } from 'animejs';

const cardBg = { padding: 32, borderRadius: 14, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)' };
const dimLabel = { fontSize: '0.78rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-tertiary)', marginBottom: 24 };
const demoColors = { primary: 'var(--accent-light)', secondary: '#a855f7', accent: '#ec4899' };
const demoGradient = (c) => `linear-gradient(135deg, ${c}, ${c}88)`;

const AnimationShowcase = () => {
    const {
        staggerFadeIn, slideInLeft, slideInRight, scaleIn, rotateIn,
        float, glitch, bounceIn, magneticButton, revealOnScroll,
    } = useAnimeAnimations();

    const magneticRef = useRef(null);
    const floatingRef = useRef(null);
    const glitchRef = useRef(null);

    useEffect(() => {
        slideInLeft('.showcase-header');
        setTimeout(() => { staggerFadeIn('.demo-card', 150); }, 300);
        if (floatingRef.current) float(floatingRef.current, 15);
        if (magneticRef.current) { const cleanup = magneticButton(magneticRef); return cleanup; }
        const cleanupScroll = revealOnScroll('.reveal-item');
        return cleanupScroll;
    }, []);

    const runAnimation = (type) => {
        const target = `.demo-target-${type}`;
        switch (type) {
            case 'stagger':
                remove(target);
                document.querySelectorAll(target).forEach(el => { el.style.opacity = '0'; el.style.transform = 'translateY(20px)'; });
                setTimeout(() => staggerFadeIn(target, 100), 100);
                break;
            case 'scale':
                remove(target); document.querySelector(target).style.opacity = '0'; document.querySelector(target).style.transform = 'scale(0.8)';
                setTimeout(() => scaleIn(target), 100); break;
            case 'bounce':
                remove(target); document.querySelector(target).style.opacity = '0'; document.querySelector(target).style.transform = 'scale(0)';
                setTimeout(() => bounceIn(target), 100); break;
            case 'rotate':
                remove(target); document.querySelector(target).style.opacity = '0'; document.querySelector(target).style.transform = 'rotate(-90deg)';
                setTimeout(() => rotateIn(target), 100); break;
            case 'slide-left':
                remove(target); document.querySelector(target).style.opacity = '0'; document.querySelector(target).style.transform = 'translateX(-50px)';
                setTimeout(() => slideInLeft(target), 100); break;
            case 'slide-right':
                remove(target); document.querySelector(target).style.opacity = '0'; document.querySelector(target).style.transform = 'translateX(50px)';
                setTimeout(() => slideInRight(target), 100); break;
            case 'glitch':
                if (glitchRef.current) glitch(glitchRef.current); break;
            default: break;
        }
    };

    const demos = [
        { id: 'stagger', title: 'Stagger Fade In', description: 'Elements fade in sequentially with a delay', icon: Layers, color: demoColors.primary },
        { id: 'scale', title: 'Scale In', description: 'Element scales from small to full size', icon: Zap, color: demoColors.secondary },
        { id: 'bounce', title: 'Bounce In', description: 'Elastic bounce effect on entry', icon: Sparkles, color: demoColors.accent },
        { id: 'rotate', title: 'Rotate In', description: 'Element rotates into view', icon: Code, color: demoColors.primary },
        { id: 'slide-left', title: 'Slide Left', description: 'Slides in from the left', icon: MousePointer, color: demoColors.secondary },
        { id: 'slide-right', title: 'Slide Right', description: 'Slides in from the right', icon: Eye, color: demoColors.accent },
    ];

    return (
        <div>
            {/* Header */}
            <header className="showcase-header" style={{ marginBottom: 80 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
                    <div style={{ padding: 16, borderRadius: 16, background: 'rgba(124,92,252,0.08)', color: 'var(--accent-light)' }}>
                        <Sparkles size={40} />
                    </div>
                    <div>
                        <h1 style={{ fontSize: '3rem', fontWeight: 900, letterSpacing: '-0.04em', textTransform: 'uppercase' }}>
                            Animation <span style={{
                                background: 'linear-gradient(135deg, var(--accent-light), #ec4899)',
                                WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent',
                            }}>Showcase</span>
                        </h1>
                        <p style={{ color: 'var(--text-secondary)', fontWeight: 700, fontSize: '0.88rem', marginTop: 8 }}>
                            Powered by Anime.js • 20+ Premium Effects
                        </p>
                    </div>
                </div>
            </header>

            {/* Demos Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 32, marginBottom: 80 }}>
                {demos.map((demo) => (
                    <div key={demo.id} className="demo-card"
                        onClick={() => runAnimation(demo.id)}
                        style={{ ...cardBg, cursor: 'pointer', transition: 'transform 0.3s ease, border-color 0.3s ease' }}
                        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.borderColor = 'rgba(124,92,252,0.3)'; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'var(--border)'; }}>

                        <div style={{ padding: 12, borderRadius: 16, background: `${demo.color}15`, color: demo.color, width: 'fit-content', marginBottom: 16 }}>
                            <demo.icon size={24} />
                        </div>
                        <h3 style={{ fontSize: '1.2rem', fontWeight: 900, marginBottom: 8 }}>{demo.title}</h3>
                        <p style={{ color: 'var(--text-tertiary)', fontSize: '0.88rem', marginBottom: 24 }}>{demo.description}</p>

                        {/* Demo target */}
                        <div style={{
                            border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 24,
                            background: 'rgba(255,255,255,0.03)', minHeight: 120, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            {demo.id === 'stagger' ? (
                                <div style={{ display: 'flex', gap: 12 }}>
                                    {[1, 2, 3, 4].map(i => (
                                        <div key={i} className={`demo-target-${demo.id}`}
                                            style={{ width: 48, height: 48, borderRadius: 12, background: demoGradient(demo.color) }} />
                                    ))}
                                </div>
                            ) : (
                                <div className={`demo-target-${demo.id}`}
                                    style={{
                                        width: 80, height: 80, borderRadius: 16, background: demoGradient(demo.color),
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    }}>
                                    <demo.icon size={32} style={{ color: '#fff' }} />
                                </div>
                            )}
                        </div>

                        <button className="btn btn-ghost" style={{ width: '100%', marginTop: 16, padding: '8px 0', fontSize: '0.78rem' }}>
                            Run Animation
                        </button>
                    </div>
                ))}
            </div>

            {/* Special Effects */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 32, marginBottom: 80 }}>
                {/* Floating */}
                <div style={cardBg}>
                    <h3 style={dimLabel}>Floating Effect</h3>
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
                        <div ref={floatingRef} style={{
                            width: 96, height: 96, borderRadius: 24,
                            background: 'linear-gradient(135deg, var(--accent-light), #a855f7)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 25px 50px -12px rgba(124,92,252,0.3)',
                        }}>
                            <Sparkles size={40} style={{ color: '#fff' }} />
                        </div>
                    </div>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', textAlign: 'center' }}>Continuous floating animation</p>
                </div>

                {/* Magnetic */}
                <div style={cardBg}>
                    <h3 style={dimLabel}>Magnetic Button</h3>
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
                        <button ref={magneticRef} className="btn btn-primary"
                            style={{ padding: '16px 32px', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <MousePointer size={20} /> Hover Me
                        </button>
                    </div>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', textAlign: 'center' }}>Follows your cursor on hover</p>
                </div>

                {/* Glitch */}
                <div style={cardBg}>
                    <h3 style={dimLabel}>Glitch Effect</h3>
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
                        <div ref={glitchRef} onClick={() => runAnimation('glitch')}
                            style={{
                                fontSize: '2rem', fontWeight: 900, cursor: 'pointer',
                                background: 'linear-gradient(135deg, var(--accent-light), #ec4899)',
                                WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent',
                            }}>
                            ZENITH
                        </div>
                    </div>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', textAlign: 'center' }}>Click to trigger glitch</p>
                </div>
            </div>

            {/* Scroll Reveal */}
            <div style={{ marginBottom: 80 }}>
                <h2 style={{ fontSize: '1.8rem', fontWeight: 900, marginBottom: 32, textAlign: 'center' }}>
                    Scroll <span style={{ color: 'var(--accent-light)' }}>Reveal</span> Animation
                </h2>
                <p style={{ color: 'var(--text-secondary)', textAlign: 'center', marginBottom: 48, maxWidth: 560, margin: '0 auto 48px' }}>
                    Elements below will animate into view as you scroll down
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="reveal-item" style={{ ...cardBg, padding: 48 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                                <div style={{
                                    width: 64, height: 64, borderRadius: 16, background: 'rgba(124,92,252,0.08)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    <Zap size={32} style={{ color: 'var(--accent-light)' }} />
                                </div>
                                <div>
                                    <h3 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: 8 }}>Scroll Reveal Item {i}</h3>
                                    <p style={{ color: 'var(--text-tertiary)' }}>This element animates when it enters the viewport</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Stats */}
            <div style={{
                ...cardBg, padding: 48,
                background: 'linear-gradient(135deg, rgba(124,92,252,0.04), rgba(168,85,247,0.04))',
                borderColor: 'rgba(124,92,252,0.15)',
            }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 32, textAlign: 'center' }}>
                    {[
                        { value: '20+', label: 'Animation Types' },
                        { value: '60fps', label: 'Performance' },
                        { value: 'GPU', label: 'Accelerated' },
                        { value: '∞', label: 'Possibilities' },
                    ].map((s, i) => (
                        <div key={i}>
                            <div style={{ fontSize: '3rem', fontWeight: 900, marginBottom: 8 }}>{s.value}</div>
                            <div style={{
                                fontSize: '0.72rem', fontWeight: 900, textTransform: 'uppercase',
                                letterSpacing: '0.12em', color: 'var(--text-tertiary)',
                            }}>{s.label}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default AnimationShowcase;
