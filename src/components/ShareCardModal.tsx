import React, { useEffect, useRef, useState } from 'react';
import { Download, Share2, Sparkles, X, Check, Disc, ExternalLink } from 'lucide-react';
import { AnalysisResult, SongCandidate } from '../types';

interface ShareCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  song: SongCandidate;
  analysis: AnalysisResult;
}

type CardThemeId = 'hummit-studio' | 'aura-chrome' | 'acid-kitsch';

interface ThemeOption {
  id: CardThemeId;
  name: string;
  tag: string;
  previewGrad: string;
}

const THEMES: ThemeOption[] = [
  {
    id: 'hummit-studio',
    name: 'HUMMIT STUDIO',
    tag: '허밋 앰버 골드 & 레트로 LP 바이닐',
    previewGrad: 'from-[#F5B041] via-[#FFB300] to-[#FF5722]',
  },
  {
    id: 'aura-chrome',
    name: 'AURA CHROME',
    tag: '핀터레스트 다크 오라 & 크롬 LP',
    previewGrad: 'from-[#ff2a85] via-[#7c3aed] to-[#00f0ff]',
  },
  {
    id: 'acid-kitsch',
    name: 'ACID Y2K',
    tag: '일렉트릭 라임 & 하이틴 스티커',
    previewGrad: 'from-[#a3e635] via-[#10b981] to-[#ff2a85]',
  },
];

function drawFourPointStar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
  fillStyle: string | CanvasGradient
) {
  ctx.save();
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = (i * Math.PI) / 4;
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = fillStyle;
  ctx.fill();
  ctx.restore();
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function wrapKoreanText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (ctx.measureText(testLine).width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

export const ShareCardModal: React.FC<ShareCardModalProps> = ({
  isOpen,
  onClose,
  song,
  analysis,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [theme, setTheme] = useState<CardThemeId>('hummit-studio');
  const [customNickname, setCustomNickname] = useState<string>('@hummit_studio');
  const [copiedNotice, setCopiedNotice] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;
    renderStoryCanvas();
  }, [isOpen, theme, song, analysis, customNickname]);

  const renderStoryCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = 1080;
    const H = 1920;
    canvas.width = W;
    canvas.height = H;

    // 1. Deep Warm Charcoal Studio Base Background (#121216)
    ctx.fillStyle = '#121216';
    ctx.fillRect(0, 0, W, H);

    // Theme Palette Setup
    const palette =
      theme === 'hummit-studio'
        ? {
            orb1: 'rgba(245, 176, 65, 0.45)',
            orb2: 'rgba(255, 87, 34, 0.38)',
            orb3: 'rgba(255, 179, 0, 0.34)',
            accent: '#F5B041',
            secondary: '#FF5722',
            badgeBg: '#FF5722',
            badgeText: '#ffffff',
          }
        : theme === 'aura-chrome'
        ? {
            orb1: 'rgba(255, 42, 133, 0.52)',
            orb2: 'rgba(124, 58, 237, 0.48)',
            orb3: 'rgba(0, 240, 255, 0.42)',
            accent: '#ff2a85',
            secondary: '#00f0ff',
            badgeBg: '#ff2a85',
            badgeText: '#ffffff',
          }
        : {
            orb1: 'rgba(163, 230, 53, 0.48)',
            orb2: 'rgba(255, 42, 133, 0.46)',
            orb3: 'rgba(16, 185, 129, 0.38)',
            accent: '#a3e635',
            secondary: '#ff2a85',
            badgeBg: '#a3e635',
            badgeText: '#121216',
          };

    // 2. Warm Studio Ambient Glow Orbs
    const drawOrb = (x: number, y: number, r: number, color: string) => {
      const grad = ctx.createRadialGradient(x, y, 10, x, y, r);
      grad.addColorStop(0, color);
      grad.addColorStop(1, 'rgba(18, 18, 22, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
    };

    drawOrb(220, 380, 620, palette.orb1);
    drawOrb(860, 780, 680, palette.orb2);
    drawOrb(340, 1460, 640, palette.orb3);

    // Subtle Studio Grid Lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1.5;
    for (let x = 90; x < W; x += 180) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let y = 120; y < H; y += 180) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    // Outer Frame Border
    drawRoundedRect(ctx, 48, 48, W - 96, H - 96, 44);
    ctx.strokeStyle = 'rgba(245, 176, 65, 0.25)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 3. Top Header Metadata Bar
    ctx.fillStyle = '#F9F9FB';
    ctx.font = '700 24px "JetBrains Mono", monospace';
    ctx.fillText('HUMMIT // AI HUMMING STUDIO', 96, 118);

    // Top Right Pill Tag
    drawRoundedRect(ctx, W - 340, 82, 244, 50, 25);
    ctx.fillStyle = 'rgba(245, 176, 65, 0.14)';
    ctx.fill();
    ctx.strokeStyle = palette.accent;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = palette.accent;
    ctx.font = '700 22px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${song.confidence}% MATCH!`, W - 218, 115);
    ctx.textAlign = 'left';

    // 4. Centerpiece Vinyl Record Disc + Hummit Bear Emblem
    const discX = W / 2;
    const discY = 520;
    const discR = 250;

    // Outer Warm Amber Aura Ring
    ctx.save();
    ctx.beginPath();
    ctx.arc(discX, discY, discR + 24, 0, Math.PI * 2);
    ctx.strokeStyle = palette.accent;
    ctx.lineWidth = 3;
    ctx.setLineDash([14, 10]);
    ctx.stroke();
    ctx.restore();

    // Glossy Vinyl Record Disc
    const vinylGrad = ctx.createLinearGradient(discX - discR, discY - discR, discX + discR, discY + discR);
    vinylGrad.addColorStop(0, '#24201c');
    vinylGrad.addColorStop(0.45, '#0c0b0e');
    vinylGrad.addColorStop(0.5, '#3b3226');
    vinylGrad.addColorStop(0.55, '#0c0b0e');
    vinylGrad.addColorStop(1, '#1e1b18');

    ctx.beginPath();
    ctx.arc(discX, discY, discR, 0, Math.PI * 2);
    ctx.fillStyle = vinylGrad;
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(245, 176, 65, 0.35)';
    ctx.stroke();

    // Vinyl Grooves
    for (let r = 115; r < discR - 15; r += 22) {
      ctx.beginPath();
      ctx.arc(discX, discY, r, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Center Warm Vinyl Label
    const labelGrad = ctx.createLinearGradient(discX - 95, discY - 95, discX + 95, discY + 95);
    labelGrad.addColorStop(0, palette.accent);
    labelGrad.addColorStop(1, palette.secondary);
    ctx.beginPath();
    ctx.arc(discX, discY, 96, 0, Math.PI * 2);
    ctx.fillStyle = labelGrad;
    ctx.fill();

    // Cute Hummit Teddy Bear Icon inside Vinyl Center
    ctx.fillStyle = '#dfa972';
    ctx.beginPath();
    ctx.arc(discX - 44, discY - 38, 22, 0, Math.PI * 2);
    ctx.arc(discX + 44, discY - 38, 22, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#f9f5ed';
    ctx.beginPath();
    ctx.arc(discX - 44, discY - 38, 12, 0, Math.PI * 2);
    ctx.arc(discX + 44, discY - 38, 12, 0, Math.PI * 2);
    ctx.fill();

    // Bear Head
    ctx.fillStyle = '#dfa972';
    ctx.beginPath();
    ctx.ellipse(discX, discY + 2, 58, 50, 0, 0, Math.PI * 2);
    ctx.fill();

    // Creamy-White Snout
    ctx.fillStyle = '#f9f5ed';
    ctx.beginPath();
    ctx.ellipse(discX, discY + 14, 28, 22, 0, 0, Math.PI * 2);
    ctx.fill();

    // Chocolate Oval Nose
    ctx.fillStyle = '#26130b';
    ctx.beginPath();
    ctx.ellipse(discX, discY + 8, 11, 7.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Close-Set Button Eyes
    ctx.fillStyle = '#110c09';
    ctx.beginPath();
    ctx.ellipse(discX - 16, discY - 12, 6.5, 8, -0.1, 0, Math.PI * 2);
    ctx.ellipse(discX + 16, discY - 12, 6.5, 8, 0.1, 0, Math.PI * 2);
    ctx.fill();

    // Sparkle Stars around Vinyl
    const chromeGrad = ctx.createLinearGradient(0, 200, 0, 800);
    chromeGrad.addColorStop(0, '#FFF8E7');
    chromeGrad.addColorStop(0.5, '#F5B041');
    chromeGrad.addColorStop(1, '#FF5722');

    drawFourPointStar(ctx, discX - 270, discY - 170, 44, 12, chromeGrad);
    drawFourPointStar(ctx, discX + 280, discY + 130, 52, 14, palette.accent);
    drawFourPointStar(ctx, discX + 240, discY - 210, 28, 8, palette.secondary);

    // Floating Sticker Badge
    ctx.save();
    ctx.translate(discX + 185, discY - 175);
    ctx.rotate(0.14);
    drawRoundedRect(ctx, -135, -32, 270, 64, 32);
    ctx.fillStyle = palette.badgeBg;
    ctx.fill();
    ctx.fillStyle = palette.badgeText;
    ctx.font = '900 24px "Outfit", "Pretendard", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`★ ${song.moodTag} ★`, 0, 9);
    ctx.restore();

    // 5. Main Dark Frosted Glass Track Card (rgba(30, 30, 38, 0.85))
    const cardX = 88;
    const cardY = 835;
    const cardW = W - 176;
    const cardH = 870;

    drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 42);
    ctx.fillStyle = 'rgba(30, 30, 38, 0.88)';
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = 'rgba(245, 176, 65, 0.25)';
    ctx.stroke();

    // Chaos Level Tag
    drawRoundedRect(ctx, cardX + 48, cardY + 46, 360, 52, 26);
    ctx.fillStyle = 'rgba(255, 87, 34, 0.12)';
    ctx.fill();
    ctx.strokeStyle = palette.secondary;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = palette.secondary;
    ctx.font = '700 23px "Pretendard", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`🎙️ ${analysis.userHummingSummary.chaosLevel}`, cardX + 74, cardY + 80);

    // Matched Song Title & Artist
    ctx.fillStyle = '#F9F9FB';
    ctx.font = '900 68px "Outfit", "Pretendard", sans-serif';
    const titleText = song.title.length > 18 ? song.title.slice(0, 17) + '…' : song.title;
    ctx.fillText(titleText, cardX + 48, cardY + 182);

    ctx.fillStyle = palette.accent;
    ctx.font = '700 38px "Pretendard", "Outfit", sans-serif';
    ctx.fillText(`${song.artist}  ·  ${song.releaseYear}`, cardX + 48, cardY + 240);

    // Divider Line
    ctx.beginPath();
    ctx.moveTo(cardX + 48, cardY + 282);
    ctx.lineTo(cardX + cardW - 48, cardY + 282);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // User's Humming Phonetic Transcription Box
    drawRoundedRect(ctx, cardX + 48, cardY + 316, cardW - 96, 150, 26);
    ctx.fillStyle = 'rgba(18, 18, 22, 0.65)';
    ctx.fill();

    ctx.fillStyle = '#A0A0AB';
    ctx.font = '600 21px "JetBrains Mono", monospace';
    ctx.fillText('WHAT I HUMMED // 내 흥얼거림 채보', cardX + 80, cardY + 360);

    ctx.fillStyle = '#F9F9FB';
    ctx.font = '700 31px "Pretendard", sans-serif';
    const humText = `"${analysis.userHummingSummary.hummedPhonetics}"`;
    const humLines = wrapKoreanText(ctx, humText, cardW - 160);
    ctx.fillText(humLines[0] || humText, cardX + 80, cardY + 418);

    // Golden & Coral Waveform Visualization Bars
    const waveY = cardY + 545;
    const peaks = analysis.userHummingSummary.waveformPeaks || [0.4, 0.8, 0.6, 0.95, 0.7, 0.85, 0.5, 0.9, 0.75, 0.6, 0.88, 0.45];
    const barCount = 28;
    const totalWaveW = cardW - 96;
    const barGap = totalWaveW / barCount;

    for (let i = 0; i < barCount; i++) {
      const p = peaks[i % peaks.length];
      const barH = 24 + p * 76;
      const bx = cardX + 48 + i * barGap;
      const by = waveY - barH / 2;

      const bGrad = ctx.createLinearGradient(bx, by, bx, by + barH);
      bGrad.addColorStop(0, palette.accent);
      bGrad.addColorStop(1, palette.secondary);

      drawRoundedRect(ctx, bx, by, 14, barH, 7);
      ctx.fillStyle = bGrad;
      ctx.fill();
    }

    // Hummit Bear Comment & Telemetry Specs
    ctx.fillStyle = '#F9F9FB';
    ctx.font = '600 26px "Pretendard", sans-serif';
    const commentLines = wrapKoreanText(ctx, `🧸 HUMMIT: ${analysis.userHummingSummary.popboyComment}`, cardW - 96);
    commentLines.slice(0, 2).forEach((line, idx) => {
      ctx.fillText(line, cardX + 48, cardY + 655 + idx * 40);
    });

    // Bottom Spec Pills inside Card
    const specs = [
      `TEMPO ${song.bpm} BPM`,
      `PITCH ${analysis.userHummingSummary.pitchAccuracy}%`,
      `GROOVE ${analysis.userHummingSummary.rhythmStability}%`,
    ];
    specs.forEach((sp, i) => {
      const px = cardX + 48 + i * 275;
      const py = cardY + 765;
      drawRoundedRect(ctx, px, py, 250, 56, 18);
      ctx.fillStyle = 'rgba(245, 176, 65, 0.1)';
      ctx.fill();
      ctx.fillStyle = '#F5B041';
      ctx.font = '700 22px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(sp, px + 125, py + 36);
    });
    ctx.textAlign = 'left';

    // 6. Footer Barcode & Creator Handle
    ctx.fillStyle = '#A0A0AB';
    ctx.font = '700 26px "JetBrains Mono", monospace';
    ctx.fillText(customNickname || '@hummit_studio', 96, 1810);

    // Aesthetic Barcode Bars on Bottom Right
    let bx = W - 340;
    for (let i = 0; i < 26; i++) {
      const bw = i % 3 === 0 ? 6 : i % 2 === 0 ? 3 : 2;
      ctx.fillStyle = 'rgba(245, 176, 65, 0.7)';
      ctx.fillRect(bx, 1775, bw, 44);
      bx += bw + 5;
    }
  };

  if (!isOpen) return null;

  const handleDownloadPng = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `HUMMIT_${song.title.replace(/\s+/g, '_')}_story.png`;
    link.href = dataUrl;
    link.click();
  };

  const handleNativeShare = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'));
      if (blob && navigator.share) {
        const file = new File([blob], `hummit_${song.title}.png`, { type: 'image/png' });
        await navigator.share({
          title: `Hummit(허밋)이 내 흥얼거림으로 찾은 노래: ${song.title} - ${song.artist}`,
          text: `내가 "${analysis.userHummingSummary.hummedPhonetics}"라고 흥얼거렸는데 Hummit AI가 ${song.confidence}% 확률로 맞췄어!`,
          files: [file],
        });
        return;
      }
    } catch {
      // Fallback to download
    }
    handleDownloadPng();
    setCopiedNotice(true);
    setTimeout(() => setCopiedNotice(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-fadeIn">
      <div className="relative w-full max-w-4xl hummit-glass rounded-3xl p-5 sm:p-7 border border-amber-500/25 shadow-2xl max-h-[92vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-[#F9F9FB] transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          {/* Left Column: Live 9:16 Story Card Preview */}
          <div className="md:col-span-5 flex flex-col items-center">
            <div className="relative w-[260px] sm:w-[290px] aspect-[9/16] rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(245,176,65,0.28)] border border-amber-500/30 bg-[#121216]">
              <canvas
                ref={canvasRef}
                className="w-full h-full object-contain"
              />
            </div>
            <span className="mt-2.5 text-[11px] font-mono text-[#A0A0AB]">
              1080 × 1920px (Instagram Story / Reels 규격)
            </span>
          </div>

          {/* Right Column: Theme Customizer & Share Actions */}
          <div className="md:col-span-7 flex flex-col gap-5">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-[#F5B041] text-xs font-mono mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                <span>HUMMIT RETRO VINYL CARD GENERATOR</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#F9F9FB]">
                이 노래가 맞군요! 🎉
              </h3>
              <p className="text-sm text-[#A0A0AB] mt-1">
                인스타 스토리에 바로 공유할 수 있는 허밋 레트로 LP 스튜디오 카드를 생성했어요.
              </p>
            </div>

            {/* Theme Selector */}
            <div className="space-y-2">
              <label className="text-xs font-mono uppercase tracking-wider text-[#A0A0AB]">
                1. 스튜디오 LP 카드 테마 선택 (3종)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {THEMES.map((t) => {
                  const active = theme === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setTheme(t.id)}
                      className={`p-3 rounded-2xl text-left border transition-all ${
                        active
                          ? 'bg-amber-500/15 border-[#F5B041] shadow-[0_0_20px_rgba(245,176,65,0.25)]'
                          : 'bg-white/5 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      <div className={`w-full h-2 rounded-full bg-gradient-to-r ${t.previewGrad} mb-2`} />
                      <div className="font-mono text-xs font-bold text-[#F9F9FB]">{t.name}</div>
                      <div className="text-[11px] text-[#A0A0AB] mt-0.5 line-clamp-1">{t.tag}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Instagram Handle Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono uppercase tracking-wider text-[#A0A0AB]">
                2. 카드 하단 인스타 아이디 / 시그니처 태그
              </label>
              <input
                type="text"
                value={customNickname}
                onChange={(e) => setCustomNickname(e.target.value)}
                maxLength={28}
                placeholder="@your_insta_id"
                className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/15 text-sm font-mono text-[#F9F9FB] focus:outline-none focus:border-[#F5B041]"
              />
            </div>

            {/* Matched Song Quick Summary */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#F5B041] to-[#FF5722] flex items-center justify-center shrink-0">
                  <Disc className="w-6 h-6 text-[#121216] animate-spin" style={{ animationDuration: '6s' }} />
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-[#F9F9FB] truncate">{song.title}</div>
                  <div className="text-xs text-[#A0A0AB] truncate">{song.artist} · {song.bpm} BPM</div>
                </div>
              </div>
              <a
                href={`https://www.youtube.com/results?search_query=${encodeURIComponent(song.youtubeQuery)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2 rounded-xl bg-[#FF5722]/20 hover:bg-[#FF5722]/30 border border-[#FF5722]/40 text-[#F9F9FB] text-xs font-semibold flex items-center gap-1.5 shrink-0 transition"
              >
                <span>YouTube 원곡</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Download & Share Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-1">
              <button
                onClick={handleDownloadPng}
                className="flex-1 py-3.5 px-5 rounded-2xl bg-gradient-to-r from-[#F5B041] via-[#FFB300] to-[#FF5722] text-[#121216] font-extrabold text-sm flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(245,176,65,0.4)] hover:opacity-95 transition"
              >
                <Download className="w-4 h-4" />
                <span>스토리용 고화질 PNG 저장</span>
              </button>
              <button
                onClick={handleNativeShare}
                className="py-3.5 px-5 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/20 text-[#F9F9FB] font-semibold text-sm flex items-center justify-center gap-2 transition"
              >
                {copiedNotice ? (
                  <>
                    <Check className="w-4 h-4 text-[#F5B041]" />
                    <span>이미지 저장 완료!</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-4 h-4" />
                    <span>SNS 공유하기</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
