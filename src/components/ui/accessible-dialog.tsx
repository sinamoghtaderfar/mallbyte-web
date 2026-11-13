"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

type DialogProps = {
  children: ReactNode;
  labelledBy: string;
  describedBy?: string;
  className: string;
  overlayClassName: string;
  onClose: () => void;
  dismissible?: boolean;
  closeOnBackdrop?: boolean;
};

type BackgroundState = { inert: string | null; hidden: string | null };
const stack: HTMLElement[] = [];
const background = new Map<HTMLElement, BackgroundState>();
let bodyOverflow = "";

function restore(element: HTMLElement, state: BackgroundState) {
  if (state.inert === null) element.removeAttribute("inert");
  else element.setAttribute("inert", state.inert);
  if (state.hidden === null) element.removeAttribute("aria-hidden");
  else element.setAttribute("aria-hidden", state.hidden);
}

function updateBackground() {
  const active = stack.at(-1);
  for (const [element, state] of background) {
    if (!active || element === active || !element.isConnected) {
      restore(element, state);
      background.delete(element);
    }
  }
  if (!active) return;
  for (const child of document.body.children) {
    if (!(child instanceof HTMLElement) || child === active) continue;
    if (!background.has(child)) {
      background.set(child, {
        inert: child.getAttribute("inert"),
        hidden: child.getAttribute("aria-hidden"),
      });
    }
    child.setAttribute("inert", "");
    child.setAttribute("aria-hidden", "true");
  }
}

function focusableElements(panel: HTMLElement) {
  return Array.from(
    panel.querySelectorAll<HTMLElement>(
      'button, a[href], input:not([type="hidden"]), select, textarea, [tabindex]',
    ),
  ).filter((element) => {
    if (
      element.tabIndex < 0 ||
      element.matches(":disabled") ||
      element.closest("[hidden], [inert]")
    )
      return false;
    for (
      let node: HTMLElement | null = element;
      node && node !== panel.parentElement;
      node = node.parentElement
    ) {
      const style = getComputedStyle(node);
      if (style.display === "none" || style.visibility === "hidden")
        return false;
    }
    return true;
  });
}

/** A portal keeps the dialog outside the page made inert while it is open. */
export function AccessibleDialog({
  children,
  labelledBy,
  describedBy,
  className,
  overlayClassName,
  onClose,
  dismissible = true,
  closeOnBackdrop = false,
}: DialogProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  const dismissibleRef = useRef(dismissible);

  useLayoutEffect(() => {
    closeRef.current = onClose;
    dismissibleRef.current = dismissible;
  }, [onClose, dismissible]);

  useLayoutEffect(() => {
    const overlay = overlayRef.current;
    const panel = panelRef.current;
    if (!overlay || !panel) return;
    const previous =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    if (!stack.length) {
      bodyOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    stack.push(overlay);
    updateBackground();
    const isTop = () => stack.at(-1) === overlay;
    const focusInitial = () => {
      const target =
        panel.querySelector<HTMLElement>("[data-dialog-initial-focus]") ??
        focusableElements(panel)[0] ??
        panel;
      target.focus();
    };
    focusInitial();

    function onKeyDown(event: KeyboardEvent) {
      if (!isTop()) return;
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        if (dismissibleRef.current) closeRef.current();
      } else if (event.key === "Tab") {
        const items = focusableElements(panel!);
        const first = items[0];
        const last = items.at(-1);
        const active = document.activeElement;
        if (!first || !last) {
          event.preventDefault();
          panel!.focus();
        } else if (
          event.shiftKey &&
          (active === first || !items.includes(active as HTMLElement))
        ) {
          event.preventDefault();
          last.focus();
        } else if (
          !event.shiftKey &&
          (active === last || !items.includes(active as HTMLElement))
        ) {
          event.preventDefault();
          first.focus();
        }
      }
    }
    function onFocus(event: FocusEvent) {
      if (
        isTop() &&
        event.target instanceof Node &&
        !panel!.contains(event.target)
      )
        focusInitial();
    }
    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("focusin", onFocus, true);
    const observer = new MutationObserver(updateBackground);
    observer.observe(document.body, { childList: true });
    return () => {
      observer.disconnect();
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("focusin", onFocus, true);
      const index = stack.indexOf(overlay);
      if (index !== -1) stack.splice(index, 1);
      updateBackground();
      if (!stack.length) document.body.style.overflow = bodyOverflow;
      if (previous?.isConnected && !previous.closest("[inert]"))
        previous.focus();
    };
  }, []);

  if (typeof document === "undefined") return null;
  return createPortal(
    <div
      ref={overlayRef}
      role="presentation"
      className={overlayClassName}
      onMouseDown={(event) => {
        if (
          event.target === event.currentTarget &&
          closeOnBackdrop &&
          dismissible
        )
          onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        tabIndex={-1}
        className={className}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
