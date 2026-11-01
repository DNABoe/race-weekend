// Chase-cam F1 car sprite from grid-start-hub (minigame-engine.ts), unchanged apart from type stripping.
export function drawCarSprite(ctx, carW, carH, steer, wheelPhase, scheme, player) {
  const s = clamp(steer, -1, 1);
  const noseShift = carW * 0.11 * s;
  const toe = s * 0.32;
  const roll = s * 0.055;

  // ===== GROUND CONTACT SHADOW =====
  // Wide soft outer + tighter inner shadow grounded under the chassis.
  ctx.save();
  const softShadow = ctx.createRadialGradient(noseShift * 0.25, -carH * 0.05, carW * 0.08, noseShift * 0.25, -carH * 0.05, carW * 0.72);
  softShadow.addColorStop(0, "oklch(0 0 0 / 0.6)");
  softShadow.addColorStop(0.7, "oklch(0 0 0 / 0.18)");
  softShadow.addColorStop(1, "transparent");
  ctx.fillStyle = softShadow;
  ctx.beginPath();
  ctx.ellipse(noseShift * 0.25, -carH * 0.04, carW * 0.72, carH * 0.22, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "oklch(0 0 0 / 0.55)";
  ctx.beginPath();
  ctx.ellipse(noseShift * 0.25, -carH * 0.06, carW * 0.46, carH * 0.1, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.rotate(roll);

  // ===== FLOOR / DIFFUSER (rear bumper, closest to camera) =====
  // Carbon-fibre diffuser plane with vertical strake fins and red rain light.
  ctx.fillStyle = "oklch(0.05 0 0)";
  ctx.beginPath();
  ctx.moveTo(-carW * 0.44, -carH * 0.08);
  ctx.lineTo(carW * 0.44, -carH * 0.08);
  ctx.lineTo(carW * 0.36, -carH * 0.2);
  ctx.lineTo(-carW * 0.36, -carH * 0.2);
  ctx.closePath();
  ctx.fill();
  // Diffuser fins (vertical strakes catching rim light).
  for (let i = -3; i <= 3; i++) {
    const t = i / 3;
    const xTop = t * carW * 0.32;
    const xBot = t * carW * 0.4;
    ctx.strokeStyle = "oklch(0.22 0.005 260)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(xBot, -carH * 0.08);
    ctx.lineTo(xTop, -carH * 0.2);
    ctx.stroke();
  }
  // Rain light glow in the centre of the diffuser.
  ctx.fillStyle = "oklch(0.55 0.24 26 / 0.9)";
  ctx.beginPath();
  ctx.ellipse(0, -carH * 0.13, carW * 0.028, carH * 0.018, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "oklch(0.92 0.18 26 / 0.95)";
  ctx.beginPath();
  ctx.ellipse(0, -carH * 0.13, carW * 0.014, carH * 0.009, 0, 0, Math.PI * 2);
  ctx.fill();

  // ===== REAR TYRES (huge in chase cam, flanking the gearbox) =====
  // Drawn BEFORE the wing so the wing reads as sitting on top, rising tall
  // above the tyres like a real F1 rear wing billboard.
  drawTyre(ctx, -carW * 0.42, -carH * 0.22, carW * 0.22, carH * 0.32, 0, wheelPhase, false);
  drawTyre(ctx, carW * 0.42, -carH * 0.22, carW * 0.22, carH * 0.32, 0, wheelPhase, false);

  // ===== REAR WING (dominant in chase view, sits above the rear tyres) =====
  // Tall billboard with main plane low + DRS flap high + chunky endplates that
  // rise well above the tyre tops so the wing is unmistakable.
  // Contrast strategy: a soft dark halo behind the assembly anchors the
  // silhouette against bright sky/track, while crisp rim-light edges keep
  // the wing readable under dark lighting too.
  const wingTop = -carH * 0.64; // very high on screen → reads as tall
  const wingBot = -carH * 0.2; // just above diffuser
  const wingHeight = wingBot - wingTop; // negative number magnitude

  // Soft dark halo behind the whole wing for silhouette separation.
  const haloGrad = ctx.createRadialGradient(0, -carH * 0.5, carW * 0.05, 0, -carH * 0.5, carW * 0.62);
  haloGrad.addColorStop(0, "oklch(0 0 0 / 0.42)");
  haloGrad.addColorStop(1, "oklch(0 0 0 / 0)");
  ctx.fillStyle = haloGrad;
  ctx.fillRect(-carW * 0.6, -carH * 0.7, carW * 1.2, carH * 0.55);

  // Endplates — wider + deeper black for a stronger silhouette.
  const endplateW = carW * 0.085;
  ctx.fillStyle = "oklch(0.02 0 0)";
  roundRect(ctx, -carW * 0.5, wingTop, endplateW, -wingHeight + carH * 0.02, 2);
  roundRect(ctx, carW * 0.5 - endplateW, wingTop, endplateW, -wingHeight + carH * 0.02, 2);
  // Inner shadow band (darker still) sells the carbon edge.
  ctx.fillStyle = "oklch(0.08 0.005 260)";
  ctx.fillRect(-carW * 0.5 + endplateW - Math.max(1.5, carW * 0.014), wingTop, Math.max(1.5, carW * 0.014), -wingHeight + carH * 0.02);
  ctx.fillRect(carW * 0.5 - endplateW, wingTop, Math.max(1.5, carW * 0.014), -wingHeight + carH * 0.02);
  // Bright outer rim light — vertical gradient so it varies w/ lighting angle.
  const rimGrad = ctx.createLinearGradient(0, wingTop, 0, wingBot);
  rimGrad.addColorStop(0, "oklch(1 0 0 / 0.85)");
  rimGrad.addColorStop(0.5, "oklch(1 0 0 / 0.45)");
  rimGrad.addColorStop(1, "oklch(1 0 0 / 0.7)");
  ctx.fillStyle = rimGrad;
  ctx.fillRect(-carW * 0.5, wingTop, Math.max(1.5, carW * 0.012), -wingHeight + carH * 0.02);
  ctx.fillRect(carW * 0.5 - Math.max(1.5, carW * 0.012), wingTop, Math.max(1.5, carW * 0.012), -wingHeight + carH * 0.02);

  // Main plane (lower wing, just above diffuser).
  const mainShadowGrad = ctx.createLinearGradient(0, -carH * 0.24, 0, -carH * 0.18);
  mainShadowGrad.addColorStop(0, "oklch(0.18 0.01 260)");
  mainShadowGrad.addColorStop(1, "oklch(0.02 0 0)");
  ctx.fillStyle = mainShadowGrad;
  roundRect(ctx, -carW * 0.48, -carH * 0.28, carW * 0.96, carH * 0.1, 2);
  // Crisp bottom shadow edge under the main plane.
  ctx.fillStyle = "oklch(0 0 0 / 0.55)";
  ctx.fillRect(-carW * 0.46, -carH * 0.19, carW * 0.92, Math.max(1, carH * 0.01));
  // Top face of main plane painted in body colour.
  const mainTopGrad = ctx.createLinearGradient(0, -carH * 0.32, 0, -carH * 0.28);
  mainTopGrad.addColorStop(0, scheme.body);
  mainTopGrad.addColorStop(1, scheme.side);
  ctx.fillStyle = mainTopGrad;
  roundRect(ctx, -carW * 0.48, -carH * 0.32, carW * 0.96, carH * 0.045, 2);
  // Leading edge highlight on main plane.
  ctx.fillStyle = "oklch(1 0 0 / 0.5)";
  ctx.fillRect(-carW * 0.46, -carH * 0.318, carW * 0.92, Math.max(1, carH * 0.008));

  // Tall wing pylons (swan-neck supports between gearbox and upper flap).
  ctx.fillStyle = "oklch(0.02 0 0)";
  ctx.fillRect(-carW * 0.13, -carH * 0.54, Math.max(2.5, carW * 0.034), carH * 0.34);
  ctx.fillRect(carW * 0.1, -carH * 0.54, Math.max(2.5, carW * 0.034), carH * 0.34);
  ctx.fillStyle = "oklch(1 0 0 / 0.35)";
  ctx.fillRect(-carW * 0.13, -carH * 0.54, Math.max(1, carW * 0.009), carH * 0.34);
  ctx.fillRect(carW * 0.1, -carH * 0.54, Math.max(1, carW * 0.009), carH * 0.34);

  // Upper flap (DRS) — tall and prominent, sitting high above the tyres.
  // Trailing edge (deepest part) painted slightly darker for depth.
  ctx.fillStyle = "oklch(0.02 0 0)";
  roundRect(ctx, -carW * 0.48, -carH * 0.42, carW * 0.96, carH * 0.05, 2);
  const flapGrad = ctx.createLinearGradient(0, -carH * 0.58, 0, -carH * 0.42);
  flapGrad.addColorStop(0, "oklch(0.45 0.025 260)");
  flapGrad.addColorStop(0.55, scheme.body);
  flapGrad.addColorStop(1, "oklch(0.18 0.01 260)");
  ctx.fillStyle = flapGrad;
  roundRect(ctx, -carW * 0.48, -carH * 0.58, carW * 0.96, carH * 0.17, 3);
  // Top edge sheen on flap — gradient strip rather than flat white so it
  // doesn't blow out in bright scenes but still pops in dark ones.
  const sheenGrad = ctx.createLinearGradient(-carW * 0.46, 0, carW * 0.46, 0);
  sheenGrad.addColorStop(0, "oklch(1 0 0 / 0.25)");
  sheenGrad.addColorStop(0.5, "oklch(1 0 0 / 0.85)");
  sheenGrad.addColorStop(1, "oklch(1 0 0 / 0.25)");
  ctx.fillStyle = sheenGrad;
  ctx.fillRect(-carW * 0.46, -carH * 0.575, carW * 0.92, Math.max(1.8, carH * 0.022));
  // Accent livery stripe across the flap face.
  ctx.fillStyle = scheme.accent;
  ctx.fillRect(-carW * 0.44, -carH * 0.51, carW * 0.88, Math.max(2.5, carH * 0.032));
  // Carbon weave shadow band under accent stripe.
  ctx.fillStyle = "oklch(0 0 0 / 0.45)";
  ctx.fillRect(-carW * 0.44, -carH * 0.475, carW * 0.88, Math.max(1.2, carH * 0.014));
  // Crisp trailing-edge shadow line under the flap.
  ctx.fillStyle = "oklch(0 0 0 / 0.7)";
  ctx.fillRect(-carW * 0.46, -carH * 0.41, carW * 0.92, Math.max(1, carH * 0.008));
  // Endplate top corners — small wing tip extensions for that modern F1 look.
  ctx.fillStyle = scheme.accent;
  ctx.fillRect(-carW * 0.5, -carH * 0.64, endplateW, Math.max(1.8, carH * 0.02));
  ctx.fillRect(carW * 0.5 - endplateW, -carH * 0.64, endplateW, Math.max(1.8, carH * 0.02));
  ctx.fillStyle = "oklch(0 0 0 / 0.5)";
  ctx.fillRect(-carW * 0.5, -carH * 0.622, endplateW, Math.max(1, carH * 0.006));
  ctx.fillRect(carW * 0.5 - endplateW, -carH * 0.622, endplateW, Math.max(1, carH * 0.006));

  // ===== ENGINE COVER / SHARK FIN =====
  // Tapered cover from rear wing forward to the cockpit. Gives strong volume.
  const coverGrad = ctx.createLinearGradient(-carW * 0.16, 0, carW * 0.16, 0);
  coverGrad.addColorStop(0, scheme.side);
  coverGrad.addColorStop(0.45, scheme.body);
  coverGrad.addColorStop(1, "oklch(0.82 0.06 95 / 0.92)");
  ctx.fillStyle = coverGrad;
  ctx.beginPath();
  ctx.moveTo(-carW * 0.18, -carH * 0.22);
  ctx.lineTo(carW * 0.18, -carH * 0.22);
  ctx.lineTo(carW * 0.13, -carH * 0.42);
  ctx.lineTo(-carW * 0.13, -carH * 0.42);
  ctx.closePath();
  ctx.fill();
  // Spine highlight along cover centreline (specular sheen).
  ctx.fillStyle = "oklch(1 0 0 / 0.28)";
  ctx.beginPath();
  ctx.moveTo(-carW * 0.012, -carH * 0.22);
  ctx.lineTo(carW * 0.012, -carH * 0.22);
  ctx.lineTo(carW * 0.008, -carH * 0.42);
  ctx.lineTo(-carW * 0.008, -carH * 0.42);
  ctx.closePath();
  ctx.fill();
  // Side cooling louvres.
  ctx.fillStyle = "oklch(0 0 0 / 0.45)";
  for (let i = 0; i < 3; i++) {
    const y = -carH * 0.27 - i * carH * 0.035;
    ctx.fillRect(-carW * 0.16, y, carW * 0.05, Math.max(1, carH * 0.012));
    ctx.fillRect(carW * 0.11, y, carW * 0.05, Math.max(1, carH * 0.012));
  }

  // Airbox intake on top of the cover, just behind the halo.
  ctx.fillStyle = "oklch(0.03 0 0)";
  roundRect(ctx, -carW * 0.07, -carH * 0.44, carW * 0.14, carH * 0.06, carW * 0.03);
  // Intake inner ring.
  ctx.fillStyle = "oklch(0.18 0.01 260)";
  ctx.fillRect(-carW * 0.065, -carH * 0.44, carW * 0.13, Math.max(1, carH * 0.01));
  // Camera mount above intake.
  ctx.fillStyle = scheme.accent;
  ctx.fillRect(-carW * 0.018, -carH * 0.455, carW * 0.036, Math.max(1, carH * 0.012));

  // ===== SIDEPODS (broad at the rear, tapering toward nose) =====
  // Left sidepod.
  const sidepodGrad = ctx.createLinearGradient(-carW * 0.32, 0, -carW * 0.18, 0);
  sidepodGrad.addColorStop(0, "oklch(0 0 0 / 0.55)");
  sidepodGrad.addColorStop(0.6, scheme.side);
  sidepodGrad.addColorStop(1, scheme.body);
  ctx.fillStyle = sidepodGrad;
  ctx.beginPath();
  ctx.moveTo(-carW * 0.34, -carH * 0.22);
  ctx.lineTo(-carW * 0.18, -carH * 0.22);
  ctx.lineTo(-carW * 0.16, -carH * 0.6);
  ctx.lineTo(-carW * 0.26, -carH * 0.6);
  ctx.closePath();
  ctx.fill();
  // Right sidepod (lit side).
  const sidepodGradR = ctx.createLinearGradient(carW * 0.18, 0, carW * 0.32, 0);
  sidepodGradR.addColorStop(0, scheme.body);
  sidepodGradR.addColorStop(0.7, scheme.side);
  sidepodGradR.addColorStop(1, "oklch(0.88 0.06 95 / 0.85)");
  ctx.fillStyle = sidepodGradR;
  ctx.beginPath();
  ctx.moveTo(carW * 0.18, -carH * 0.22);
  ctx.lineTo(carW * 0.34, -carH * 0.22);
  ctx.lineTo(carW * 0.26, -carH * 0.6);
  ctx.lineTo(carW * 0.16, -carH * 0.6);
  ctx.closePath();
  ctx.fill();
  // Sidepod top sheen strip.
  ctx.fillStyle = "oklch(1 0 0 / 0.18)";
  ctx.beginPath();
  ctx.moveTo(-carW * 0.18, -carH * 0.55);
  ctx.lineTo(carW * 0.18, -carH * 0.55);
  ctx.lineTo(carW * 0.16, -carH * 0.6);
  ctx.lineTo(-carW * 0.16, -carH * 0.6);
  ctx.closePath();
  ctx.fill();

  // Sidepod air inlets (deep black "shark mouths" at the front of each pod).
  ctx.fillStyle = "oklch(0.04 0 0)";
  roundRect(ctx, -carW * 0.27, -carH * 0.55, carW * 0.06, carH * 0.08, 2);
  roundRect(ctx, carW * 0.21, -carH * 0.55, carW * 0.06, carH * 0.08, 2);
  ctx.fillStyle = "oklch(0.16 0.01 260)";
  ctx.fillRect(-carW * 0.265, -carH * 0.49, carW * 0.05, Math.max(1, carH * 0.008));
  ctx.fillRect(carW * 0.215, -carH * 0.49, carW * 0.05, Math.max(1, carH * 0.008));

  // Livery accent stripe down the centre of the body (extends to nose).
  ctx.fillStyle = scheme.accent;
  ctx.fillRect(-carW * 0.025, -carH * 0.6, carW * 0.05, carH * 0.18);

  // ===== COCKPIT / HALO / DRIVER =====
  // Tub.
  const tubGrad = ctx.createLinearGradient(-carW * 0.16, 0, carW * 0.16, 0);
  tubGrad.addColorStop(0, "oklch(0.03 0 0)");
  tubGrad.addColorStop(1, "oklch(0.2 0.01 260)");
  ctx.fillStyle = tubGrad;
  roundRect(ctx, -carW * 0.15, -carH * 0.52, carW * 0.3, carH * 0.12, carW * 0.07);

  // Halo bar — titanium ring around the cockpit.
  ctx.strokeStyle = "oklch(0.14 0 0)";
  ctx.lineWidth = Math.max(2.5, carW * 0.032);
  ctx.beginPath();
  ctx.ellipse(0, -carH * 0.48, carW * 0.15, carH * 0.08, 0, 0, Math.PI, true);
  ctx.stroke();
  // Halo inner highlight (titanium gleam on top arc).
  ctx.strokeStyle = "oklch(0.72 0.01 260 / 0.7)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.ellipse(0, -carH * 0.48, carW * 0.15, carH * 0.08, 0, Math.PI * 1.05, Math.PI * 1.6, true);
  ctx.stroke();
  // Halo front strut (V to nose).
  ctx.strokeStyle = "oklch(0.1 0 0)";
  ctx.lineWidth = Math.max(1.5, carW * 0.018);
  ctx.beginPath();
  ctx.moveTo(0, -carH * 0.56);
  ctx.lineTo(0, -carH * 0.5);
  ctx.stroke();

  // Driver helmet — domed with sky reflection and visor.
  const helmetGrad = ctx.createRadialGradient(-carW * 0.02, -carH * 0.46, 0, 0, -carH * 0.44, carW * 0.13);
  helmetGrad.addColorStop(0, "oklch(1 0 0 / 0.55)");
  helmetGrad.addColorStop(0.55, scheme.helmet);
  helmetGrad.addColorStop(1, "oklch(0.35 0.04 260)");
  ctx.fillStyle = helmetGrad;
  ctx.beginPath();
  ctx.ellipse(0, -carH * 0.44, carW * 0.1, carH * 0.09, 0, 0, Math.PI * 2);
  ctx.fill();
  // Helmet livery band.
  ctx.fillStyle = scheme.accent;
  ctx.fillRect(-carW * 0.09, -carH * 0.435, carW * 0.18, Math.max(1, carH * 0.012));
  // Visor.
  const visorGrad = ctx.createLinearGradient(0, -carH * 0.47, 0, -carH * 0.42);
  visorGrad.addColorStop(0, "oklch(0.4 0.1 230)");
  visorGrad.addColorStop(0.55, "oklch(0.1 0.04 240)");
  visorGrad.addColorStop(1, "oklch(0.04 0.02 240)");
  ctx.fillStyle = visorGrad;
  roundRect(ctx, -carW * 0.08, -carH * 0.47, carW * 0.16, Math.max(2, carH * 0.045), 2);
  // Visor specular streaks.
  ctx.fillStyle = "oklch(1 0 0 / 0.55)";
  ctx.fillRect(-carW * 0.055, -carH * 0.465, carW * 0.045, 1);
  ctx.fillStyle = "oklch(1 0 0 / 0.3)";
  ctx.fillRect(carW * 0.005, -carH * 0.46, carW * 0.025, 1);

  // ===== NOSE CONE (recedes toward vanishing point) =====
  const noseGrad = ctx.createLinearGradient(-carW * 0.1 + noseShift * 0.5, 0, carW * 0.1 + noseShift * 0.5, 0);
  noseGrad.addColorStop(0, scheme.side);
  noseGrad.addColorStop(0.5, scheme.body);
  noseGrad.addColorStop(1, "oklch(0.93 0.06 90 / 0.95)");
  ctx.fillStyle = noseGrad;
  ctx.beginPath();
  ctx.moveTo(-carW * 0.12 + noseShift * 0.5, -carH * 0.6);
  ctx.lineTo(carW * 0.12 + noseShift * 0.5, -carH * 0.6);
  ctx.lineTo(carW * 0.05 + noseShift, -carH * 0.95);
  ctx.lineTo(-carW * 0.05 + noseShift, -carH * 0.95);
  ctx.closePath();
  ctx.fill();
  // Nose centreline highlight.
  ctx.fillStyle = "oklch(1 0 0 / 0.24)";
  ctx.beginPath();
  ctx.moveTo(-carW * 0.013 + noseShift * 0.75, -carH * 0.6);
  ctx.lineTo(carW * 0.013 + noseShift * 0.75, -carH * 0.6);
  ctx.lineTo(carW * 0.006 + noseShift, -carH * 0.95);
  ctx.lineTo(-carW * 0.006 + noseShift, -carH * 0.95);
  ctx.closePath();
  ctx.fill();
  // Nose tip accent badge.
  ctx.fillStyle = scheme.accent;
  ctx.fillRect(-carW * 0.035 + noseShift, -carH * 0.95, carW * 0.07, Math.max(1, carH * 0.022));
  // Tiny T-cam on nose.
  ctx.fillStyle = "oklch(0.08 0 0)";
  ctx.fillRect(-carW * 0.01 + noseShift, -carH * 0.78, carW * 0.02, Math.max(1, carH * 0.012));

  // ===== FRONT TYRES =====
  drawTyre(ctx, -carW * 0.24 + noseShift * 0.7, -carH * 0.74, carW * 0.14, carH * 0.22, toe, wheelPhase, true);
  drawTyre(ctx, carW * 0.24 + noseShift * 0.7, -carH * 0.74, carW * 0.14, carH * 0.22, toe, wheelPhase, true);

  // ===== FRONT WING (further away, smaller in perspective) =====
  // Lower plane shadow.
  ctx.fillStyle = "oklch(0.05 0 0)";
  roundRect(ctx, -carW * 0.34 + noseShift * 0.6, -carH * 0.92, carW * 0.68, carH * 0.045, 2);
  // Upper plane.
  const fwGrad = ctx.createLinearGradient(0, -carH * 1.0, 0, -carH * 0.9);
  fwGrad.addColorStop(0, "oklch(0.3 0.02 260)");
  fwGrad.addColorStop(1, "oklch(0.08 0.01 260)");
  ctx.fillStyle = fwGrad;
  roundRect(ctx, -carW * 0.34 + noseShift * 0.6, -carH * 0.98, carW * 0.68, carH * 0.07, 2);
  // Accent stripe.
  ctx.fillStyle = scheme.accent;
  ctx.fillRect(-carW * 0.26 + noseShift * 0.6, -carH * 0.955, carW * 0.52, Math.max(1, carH * 0.016));
  // Wing top sheen.
  ctx.fillStyle = "oklch(1 0 0 / 0.28)";
  ctx.fillRect(-carW * 0.3 + noseShift * 0.6, -carH * 0.975, carW * 0.6, 1);
  // Endplates.
  ctx.fillStyle = "oklch(0.05 0 0)";
  roundRect(ctx, -carW * 0.36 + noseShift * 0.6, -carH * 1.02, carW * 0.05, carH * 0.12, 1);
  roundRect(ctx, carW * 0.31 + noseShift * 0.6, -carH * 1.02, carW * 0.05, carH * 0.12, 1);
  // Endplate edge highlight (rim light).
  ctx.fillStyle = "oklch(1 0 0 / 0.22)";
  ctx.fillRect(-carW * 0.36 + noseShift * 0.6, -carH * 1.02, Math.max(1, carW * 0.01), carH * 0.12);
  ctx.fillRect(carW * 0.35 + noseShift * 0.6, -carH * 1.02, Math.max(1, carW * 0.01), carH * 0.12);
  // Cascade winglet tips.
  ctx.fillStyle = scheme.accent;
  ctx.fillRect(-carW * 0.36 + noseShift * 0.6, -carH * 1.04, carW * 0.05, Math.max(1, carH * 0.012));
  ctx.fillRect(carW * 0.31 + noseShift * 0.6, -carH * 1.04, carW * 0.05, Math.max(1, carH * 0.012));
  if (player) {
    // Sponsor stripe highlights along sidepods.
    ctx.strokeStyle = "oklch(0.98 0.01 95 / 0.32)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-carW * 0.21, -carH * 0.3);
    ctx.lineTo(-carW * 0.15, -carH * 0.56);
    ctx.moveTo(carW * 0.21, -carH * 0.3);
    ctx.lineTo(carW * 0.15, -carH * 0.56);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawTyre(ctx, cx, cy, w, h, toe, phase, isFront) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(toe * 0.5);

  // Ground contact shadow under the tyre.
  ctx.fillStyle = "oklch(0 0 0 / 0.55)";
  ctx.beginPath();
  ctx.ellipse(0, h * 0.46, w * 0.45, h * 0.07, 0, 0, Math.PI * 2);
  ctx.fill();

  // Brake disc glow peeking from behind the rim (rears glow under load).
  if (!isFront) {
    ctx.fillStyle = "oklch(0.5 0.18 38 / 0.85)";
    ctx.beginPath();
    ctx.ellipse(0, 0, w * 0.3, h * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "oklch(0.78 0.2 50 / 0.5)";
    ctx.beginPath();
    ctx.ellipse(0, 0, w * 0.18, h * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Tyre carcass — chunky slick rubber. Two stops: deep black core + slight
  // upper highlight to suggest a rounded sidewall.
  const tyreGrad = ctx.createLinearGradient(0, -h * 0.5, 0, h * 0.5);
  tyreGrad.addColorStop(0, "oklch(0.18 0.005 260)");
  tyreGrad.addColorStop(0.45, "oklch(0.07 0 0)");
  tyreGrad.addColorStop(1, "oklch(0.02 0 0)");
  ctx.fillStyle = tyreGrad;
  roundRect(ctx, -w / 2, -h / 2, w, h, w * 0.32);

  // Outer side highlight (rim-light on the right shoulder of the tyre).
  const tyreRim = ctx.createLinearGradient(-w * 0.5, 0, w * 0.5, 0);
  tyreRim.addColorStop(0, "transparent");
  tyreRim.addColorStop(0.85, "transparent");
  tyreRim.addColorStop(1, "oklch(1 0 0 / 0.18)");
  ctx.fillStyle = tyreRim;
  roundRect(ctx, -w / 2, -h / 2, w, h, w * 0.32);

  // Sidewall band with white "PIRELLI"-style lettering hint.
  ctx.fillStyle = "oklch(0.28 0 0)";
  ctx.fillRect(-w * 0.44, -h * 0.42, w * 0.88, Math.max(1, h * 0.06));
  ctx.fillStyle = "oklch(0.94 0.02 95 / 0.55)";
  ctx.fillRect(-w * 0.22, -h * 0.405, w * 0.44, Math.max(1, h * 0.022));
  // Coloured compound stripe (soft/medium/hard) — uses scheme.accent feel.
  ctx.fillStyle = isFront ? "oklch(0.78 0.22 30 / 0.85)" : "oklch(0.86 0.18 90 / 0.85)";
  ctx.fillRect(-w * 0.42, -h * 0.34, w * 0.84, Math.max(1, h * 0.012));

  // Top rubber sheen (specular arc).
  ctx.fillStyle = "oklch(0.95 0 0 / 0.28)";
  ctx.beginPath();
  ctx.ellipse(0, -h * 0.44, w * 0.34, Math.max(1, h * 0.045), 0, 0, Math.PI * 2);
  ctx.fill();

  // ===== RIM (only if large enough to read cleanly) =====
  if (w >= 12) {
    // Outer rim ring (machined alloy).
    const rimGrad = ctx.createRadialGradient(-w * 0.08, -h * 0.08, 0, 0, 0, w * 0.3);
    rimGrad.addColorStop(0, "oklch(0.85 0.01 255)");
    rimGrad.addColorStop(0.5, "oklch(0.55 0.01 255)");
    rimGrad.addColorStop(1, "oklch(0.22 0.01 255)");
    ctx.fillStyle = rimGrad;
    ctx.beginPath();
    ctx.ellipse(0, 0, w * 0.26, h * 0.26, 0, 0, Math.PI * 2);
    ctx.fill();

    // Multi-spoke rim — 5 spokes that rotate with `phase`. We draw two
    // staggered passes at half alpha for a motion-blur smear.
    const spokeCount = 5;
    const spokeLen = h * 0.24;
    const spokeThick = Math.max(1.2, w * 0.055);
    for (let pass = 0; pass < 2; pass++) {
      ctx.globalAlpha = pass === 0 ? 1 : 0.45;
      const offs = pass === 0 ? 0 : Math.PI / spokeCount;
      ctx.fillStyle = "oklch(0.16 0.005 255)";
      for (let i = 0; i < spokeCount; i++) {
        const a = phase + offs + i * Math.PI * 2 / spokeCount;
        ctx.save();
        ctx.rotate(a);
        ctx.fillRect(-spokeThick / 2, -spokeLen, spokeThick, spokeLen * 2);
        ctx.restore();
      }
    }
    ctx.globalAlpha = 1;

    // Inner rim ring.
    ctx.strokeStyle = "oklch(0.1 0 0)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(0, 0, w * 0.24, h * 0.24, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Centre hub with gloss.
    const hubGrad = ctx.createRadialGradient(-w * 0.03, -h * 0.03, 0, 0, 0, w * 0.12);
    hubGrad.addColorStop(0, "oklch(0.96 0.01 95)");
    hubGrad.addColorStop(0.6, "oklch(0.6 0.02 95)");
    hubGrad.addColorStop(1, "oklch(0.28 0.01 260)");
    ctx.fillStyle = hubGrad;
    ctx.beginPath();
    ctx.ellipse(0, 0, w * 0.1, h * 0.1, 0, 0, Math.PI * 2);
    ctx.fill();
    // Centre lug nut.
    ctx.fillStyle = "oklch(0.12 0 0)";
    ctx.beginPath();
    ctx.ellipse(0, 0, w * 0.035, h * 0.035, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Tiny tyre fallback — single dark disc to avoid shimmer.
    ctx.fillStyle = "oklch(0.18 0.005 255)";
    ctx.beginPath();
    ctx.ellipse(0, 0, w * 0.26, h * 0.26, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.max(0, Math.min(r, Math.min(w, h) / 2));
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
  ctx.fill();
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
