import { useEffect, useRef } from "react";
import { gsap } from "gsap";

import ampLogoSvgRaw from "../assets/amp-logo-login.svg?raw";

const ampLogoSvg = ampLogoSvgRaw
  .replace(/<\?xml[\s\S]*?\?>\s*/u, "")
  .replace(/<!DOCTYPE[\s\S]*?>\s*/u, "")
  .replace(/<!--[\s\S]*?-->\s*/gu, "");

export default function LoginLogoAnimation({
  className = "w-full max-w-[980px]",
}) {
  const rootRef = useRef(null);
  const rafRef = useRef(null);
  const clickTweenRef = useRef(null);
  const pointerRef = useRef({ x: 0, y: 0, tx: 0, ty: 0 });

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const svg = root.querySelector("svg");
    if (!svg) return undefined;

    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");

    const metalPlate = root.querySelector("[data-logo-layer='metal']");
    const glowLayer = root.querySelector("[data-logo-layer='glow']");
    const sheenLayer = root.querySelector("[data-logo-layer='sheen']");
    const primaryGear = svg.querySelector(".fil0");
    const accentNodes = svg.querySelectorAll(".fil1, .fil2");
    const wordmarkNodes = svg.querySelectorAll(".fil3");
    const highlightNodes = svg.querySelectorAll(".fil4");
    const darkNodes = svg.querySelectorAll(".fil0, .fil3, .fil4");

    const ctx = gsap.context(() => {
      gsap.set(root, { autoAlpha: 1 });
      gsap.set(metalPlate, {
        transformOrigin: "50% 50%",
        willChange: "transform, opacity, filter",
      });
      gsap.set(glowLayer, {
        transformOrigin: "50% 50%",
        willChange: "transform, opacity, filter",
      });
      gsap.set(sheenLayer, {
        transformOrigin: "50% 50%",
        willChange: "transform, opacity, filter",
      });
      gsap.set(svg, {
        transformOrigin: "50% 50%",
        willChange: "transform, opacity, filter",
      });
      gsap.set(primaryGear, {
        transformOrigin: "50% 50%",
        willChange: "transform, opacity, filter",
      });
      gsap.set(accentNodes, {
        transformOrigin: "50% 50%",
        willChange: "transform, opacity, filter",
      });
      gsap.set(wordmarkNodes, {
        transformOrigin: "50% 50%",
        willChange: "transform, opacity, filter",
      });
      gsap.set(highlightNodes, {
        transformOrigin: "50% 50%",
        willChange: "transform, opacity, filter",
      });
      gsap.set(darkNodes, {
        transformOrigin: "50% 50%",
        willChange: "transform, opacity, filter",
      });
      gsap.set(sheenLayer, { xPercent: -28, yPercent: -10, rotate: -10, opacity: 0.3 });
      gsap.set(glowLayer, { opacity: 0.22, scale: 0.92 });
      gsap.set(metalPlate, { opacity: 0, scale: 0.95, y: 18, filter: "blur(14px)" });

      if (prefersReducedMotion) {
        gsap.set([svg, accentNodes, darkNodes, wordmarkNodes, highlightNodes], {
          opacity: 1,
          x: 0,
          y: 0,
          rotate: 0,
          scale: 1,
          filter: "blur(0px)",
        });
        gsap.set([metalPlate, glowLayer, sheenLayer], {
          opacity: 1,
          x: 0,
          y: 0,
          rotate: 0,
          scale: 1,
          filter: "blur(0px)",
        });
        return;
      }

      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      tl.fromTo(
        root,
        {
          opacity: 0,
          y: 32,
          scale: 0.92,
          rotateX: 16,
        },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          rotateX: 0,
          duration: 1.1,
          ease: "power4.out",
        },
      )
        .to(
          metalPlate,
          {
            opacity: 1,
            scale: 1,
            y: 0,
            filter: "blur(0px)",
            duration: 1,
          },
          0,
        )
        .fromTo(
          svg,
          {
            opacity: 0,
            scale: 0.95,
            rotate: -2.5,
            x: -18,
            y: 16,
            filter: "blur(10px)",
          },
          {
            opacity: 1,
            scale: 1,
            rotate: 0,
            x: 0,
            y: 0,
            filter: "blur(0px)",
            duration: 1.04,
          },
          0.08,
        )
        .fromTo(
          primaryGear,
          {
            opacity: 0.2,
            scale: 0.9,
            rotate: -14,
            x: -28,
            y: 18,
            filter: "blur(9px)",
          },
          {
            opacity: 1,
            x: 0,
            y: 0,
            scale: 1,
            rotate: 0,
            filter: "blur(0px)",
            duration: 1.08,
            ease: "expo.out",
          },
          "-=0.62",
        )
        .fromTo(
          accentNodes,
          {
            opacity: 0.18,
            y: -14,
            scale: 0.96,
            filter: "blur(8px)",
          },
          {
            opacity: 1,
            x: 0,
            y: 0,
            scale: 1,
            filter: "blur(0px)",
            duration: 0.78,
            stagger: 0.04,
          },
          "-=0.76",
        )
        .fromTo(
          wordmarkNodes,
          {
            opacity: 0,
            x: 30,
            y: 8,
            filter: "blur(10px)",
          },
          {
            opacity: 1,
            x: 0,
            y: 0,
            filter: "blur(0px)",
            duration: 0.74,
            stagger: 0.02,
          },
          "-=0.5",
        )
        .fromTo(
          highlightNodes,
          {
            opacity: 0,
            x: 12,
            y: -10,
            scale: 0.97,
            filter: "blur(10px)",
          },
          {
            opacity: 1,
            x: 0,
            y: 0,
            scale: 1,
            filter: "blur(0px)",
            duration: 0.82,
            stagger: 0.02,
          },
          "-=0.62",
        )
        .fromTo(
          sheenLayer,
          {
            opacity: 0,
            xPercent: -40,
            yPercent: -16,
            scaleX: 0.92,
          },
          {
            opacity: 0.52,
            xPercent: -6,
            yPercent: -4,
            scaleX: 1,
            duration: 1.18,
            ease: "power2.out",
          },
          0.2,
        )
        .fromTo(
          glowLayer,
          {
            opacity: 0,
            scale: 0.8,
          },
          {
            opacity: 0.74,
            scale: 1,
            duration: 1.25,
            ease: "power2.out",
          },
          0.1,
        );

      gsap.to(primaryGear, {
        rotate: 2.25,
        y: -1.5,
        yoyo: true,
        repeat: -1,
        duration: 4.8,
        ease: "sine.inOut",
      });

      gsap.to(accentNodes, {
        y: -2.5,
        autoAlpha: 0.92,
        yoyo: true,
        repeat: -1,
        stagger: 0.08,
        duration: 3,
        ease: "sine.inOut",
      });

      gsap.to(wordmarkNodes, {
        y: -1.25,
        yoyo: true,
        repeat: -1,
        duration: 4.1,
        ease: "sine.inOut",
      });

      gsap.to(glowLayer, {
        opacity: 0.9,
        scale: 1.05,
        yoyo: true,
        repeat: -1,
        duration: 3.4,
        ease: "sine.inOut",
      });

      gsap.to(sheenLayer, {
        xPercent: 10,
        yPercent: 2,
        opacity: 0.42,
        yoyo: true,
        repeat: -1,
        duration: 4.2,
        ease: "sine.inOut",
      });
    }, root);

    if (prefersReducedMotion) {
      return () => {
        ctx.revert();
      };
    }

    const animate = () => {
      const pointer = pointerRef.current;
      pointer.tx += (pointer.x - pointer.tx) * 0.08;
      pointer.ty += (pointer.y - pointer.ty) * 0.08;

      gsap.set(root, {
        rotateY: pointer.tx * 7,
        rotateX: pointer.ty * -5,
        transformPerspective: 1200,
      });

      gsap.set(metalPlate, {
        x: pointer.tx * 10,
        y: pointer.ty * 8,
        rotate: pointer.tx * 1.4,
      });

      gsap.set(svg, {
        x: pointer.tx * 12,
        y: pointer.ty * 10,
        rotate: pointer.tx * 1.8,
      });

      gsap.set(primaryGear, {
        x: pointer.tx * 20,
        y: pointer.ty * 16,
        rotate: pointer.tx * 7,
      });

      gsap.set(accentNodes, {
        x: pointer.tx * 14,
        y: pointer.ty * 10,
        rotate: pointer.tx * 3.5,
      });

      gsap.set(wordmarkNodes, {
        x: pointer.tx * 8,
        y: pointer.ty * 5,
      });

      gsap.set(highlightNodes, {
        x: pointer.tx * 6,
        y: pointer.ty * 4,
      });

      gsap.set(glowLayer, {
        x: pointer.tx * 22,
        y: pointer.ty * 16,
      });

      gsap.set(sheenLayer, {
        x: pointer.tx * 26,
        y: pointer.ty * 14,
        rotate: -10 + pointer.tx * 8,
      });

      rafRef.current = window.requestAnimationFrame(animate);
    };

    const onMove = (event) => {
      const rect = root.getBoundingClientRect();
      const px = (event.clientX - rect.left) / rect.width;
      const py = (event.clientY - rect.top) / rect.height;

      pointerRef.current.x = (px - 0.5) * 2;
      pointerRef.current.y = (py - 0.5) * 2;
    };

    const onLeave = () => {
      pointerRef.current.x = 0;
      pointerRef.current.y = 0;
    };

    const onPointerDown = () => {
      if (clickTweenRef.current) clickTweenRef.current.kill();
      clickTweenRef.current = gsap.timeline();
      clickTweenRef.current
        .to(root, {
          scaleX: 0.986,
          scaleY: 0.972,
          y: 4,
          duration: 0.12,
          ease: "power2.out",
        })
        .to(
          primaryGear,
          {
            rotate: "+=9",
            duration: 0.18,
            ease: "power2.out",
          },
          0,
        )
        .to(
          glowLayer,
          {
            opacity: 1,
            scale: 1.08,
            duration: 0.2,
            ease: "power2.out",
          },
          0,
        )
        .to(
          sheenLayer,
          {
            opacity: 0.74,
            xPercent: 16,
            duration: 0.2,
            ease: "power2.out",
          },
          0,
        )
        .to(root, {
          scaleX: 1,
          scaleY: 1,
          y: 0,
          duration: 0.68,
          ease: "elastic.out(1, 0.45)",
        })
        .to(
          primaryGear,
          {
            rotate: "-=9",
            duration: 0.92,
            ease: "elastic.out(1, 0.42)",
          },
          "<",
        )
        .to(
          sheenLayer,
          {
            opacity: 0.42,
            xPercent: 4,
            duration: 0.8,
            ease: "power3.out",
          },
          "<",
        );
    };

    root.addEventListener("pointermove", onMove);
    root.addEventListener("pointerleave", onLeave);
    root.addEventListener("pointerdown", onPointerDown);
    rafRef.current = window.requestAnimationFrame(animate);

    return () => {
      root.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerleave", onLeave);
      root.removeEventListener("pointerdown", onPointerDown);
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
      if (clickTweenRef.current) clickTweenRef.current.kill();
      ctx.revert();
    };
  }, []);

  return (
    <div
      ref={rootRef}
      className={`relative select-none ${className}`}
      style={{ perspective: 1200, transformStyle: "preserve-3d" }}
      aria-label="Logo animada da AMP Usinagem"
    >
      <div className="login-logo-metal" data-logo-layer="metal" aria-hidden="true" />
      <div className="login-logo-glow" data-logo-layer="glow" aria-hidden="true" />
      <div className="login-logo-sheen" data-logo-layer="sheen" aria-hidden="true" />
      <div
        className="login-logo-object login-logo-animated"
        aria-hidden="true"
        dangerouslySetInnerHTML={{ __html: ampLogoSvg }}
      />
    </div>
  );
}
