"use client";
import { useEffect, type RefObject } from "react";

export function useReveal(root: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const node = root.current;
    if (!node) return;
    const targets = node.querySelectorAll<HTMLElement>("[data-reveal]");
    node.setAttribute("data-reveal-ready", "true");
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-in");
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.15 },
    );
    targets.forEach((target) => observer.observe(target));
    // Decorative loops only run while their section is visible.
    const motionObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        entry.target.classList.toggle("motion-visible", entry.isIntersecting);
      }
    });
    node
      .querySelectorAll(".ink-hero, .ink-uses, .ink-bento, .ink-close")
      .forEach((target) => motionObserver.observe(target));
    const updateVisibility = () =>
      node.classList.toggle("motion-hidden", document.hidden);
    updateVisibility();
    document.addEventListener("visibilitychange", updateVisibility);
    return () => {
      document.removeEventListener("visibilitychange", updateVisibility);
      observer.disconnect();
      motionObserver.disconnect();
    };
  }, [root]);
}
