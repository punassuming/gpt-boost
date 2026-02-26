export function createScrollUiFeature({
  refs,
  state,
  constants,
  deps
}) {
  function getScrollTarget() {
    const scrollElement = state.scrollElement;

    if (
      scrollElement === window ||
      scrollElement === document.body ||
      scrollElement === document.documentElement
    ) {
      return document.scrollingElement || document.documentElement;
    }

    return scrollElement instanceof HTMLElement ? scrollElement : null;
  }

  function getMaxScrollTop(scrollTarget) {
    if (!scrollTarget) return 0;
    return Math.max(0, scrollTarget.scrollHeight - scrollTarget.clientHeight);
  }

  function isScrollable(scrollTarget) {
    if (!scrollTarget) return false;
    return getMaxScrollTop(scrollTarget) >= constants.scrollBufferPx;
  }

  function ensureIndicatorElement() {
    if (refs.indicatorElement && refs.indicatorElement.isConnected) {
      return refs.indicatorElement;
    }

    const element = document.createElement("div");
    const theme = deps.getThemeTokens();
    const userRoleStyle = deps.getRoleSurfaceStyle("user", theme);
    element.setAttribute("data-chatgpt-virtual-indicator", "1");
    element.style.position = "fixed";
    element.style.right = `${constants.indicatorRightOffsetPx}px`;
    element.style.top = "50%";
    element.style.transform = "translateY(-50%)";
    element.style.zIndex = "10003";
    element.style.display = "none";
    element.style.width = "4px";
    element.style.height = `${constants.indicatorBaseMinHeightPx}px`;
    element.style.borderRadius = "999px";
    element.style.background = userRoleStyle.accentColor;
    element.style.border = `1px solid ${userRoleStyle.borderColor}`;
    element.style.boxShadow = "0 4px 10px rgba(15, 23, 42, 0.18)";
    element.style.opacity = String(constants.indicatorMinOpacity);
    element.style.pointerEvents = "none";
    element.style.userSelect = "none";
    element.setAttribute("aria-label", "Virtualizing messages");
    document.body.appendChild(element);
    refs.indicatorElement = element;
    deps.applyFloatingUiOffsets();
    deps.applyThemeToUi();
    return element;
  }

  function hideIndicator() {
    if (refs.indicatorElement) {
      refs.indicatorElement.style.display = "none";
    }
  }

  function setButtonVisibility(button, shouldShow) {
    if (!button) return;
    button.style.display = shouldShow ? "flex" : "none";
  }

  function scrollToEdge(position) {
    const attemptScroll = (attempt) => {
      const scrollTarget = getScrollTarget();
      if (!scrollTarget) return;

      const maxScrollTop = getMaxScrollTop(scrollTarget);
      const targetTop = position === "top" ? 0 : maxScrollTop;
      scrollTarget.scrollTo({ top: targetTop, behavior: "smooth" });

      if (attempt < constants.maxScrollAttempts) {
        setTimeout(() => {
          const updatedTarget = getScrollTarget();
          if (!updatedTarget) return;
          const updatedMax = getMaxScrollTop(updatedTarget);
          const atEdge =
            position === "top"
              ? updatedTarget.scrollTop <= constants.scrollBufferPx
              : updatedTarget.scrollTop >= updatedMax - constants.scrollBufferPx;

          if (!atEdge) attemptScroll(attempt + 1);
        }, constants.scrollRetryDelayMs);
      }
    };

    attemptScroll(0);
  }

  function ensureScrollButton(position) {
    const existingButton = position === "top" ? refs.scrollToTopButton : refs.scrollToBottomButton;
    if (existingButton && existingButton.isConnected) {
      return existingButton;
    }

    if (!document.body) {
      return null;
    }

    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("data-chatgpt-virtual-scroll", position);
    button.style.position = "fixed";
    button.style.right = `${constants.scrollButtonOffsetPx}px`;
    button.style.zIndex = "10002";
    button.style.boxShadow = "0 6px 16px rgba(15, 23, 42, 0.2)";
    button.style.display = "none";
    deps.styleSearchButton(button, constants.scrollButtonSizePx);

    if (position === "top") {
      button.style.top = `${constants.scrollButtonTopOffsetPx}px`;
      button.textContent = "↑";
      button.setAttribute("aria-label", "Scroll to top");
    } else {
      button.style.bottom = `${constants.scrollButtonOffsetPx}px`;
      button.textContent = "↓";
      button.setAttribute("aria-label", "Scroll to bottom");
    }

    button.addEventListener("click", () => {
      scrollToEdge(position);
    });

    document.body.appendChild(button);

    if (position === "top") {
      refs.scrollToTopButton = button;
    } else {
      refs.scrollToBottomButton = button;
    }

    deps.applyFloatingUiOffsets();
    deps.applyThemeToUi();
    return button;
  }

  function hideScrollButtons() {
    if (refs.scrollToTopButton) refs.scrollToTopButton.style.display = "none";
    if (refs.scrollToBottomButton) refs.scrollToBottomButton.style.display = "none";
  }

  function updateScrollButtons() {
    if (!state.enabled) {
      hideScrollButtons();
      return;
    }

    let scrollTarget = getScrollTarget();

    if (!scrollTarget) {
      const candidates = [];
      if (state.scrollElement instanceof HTMLElement) candidates.push(state.scrollElement);
      const docFallback = document.scrollingElement || document.documentElement || document.body;
      if (docFallback) candidates.push(docFallback);

      let maxScrollable = 0;
      candidates.forEach((candidate) => {
        if (!candidate) return;
        const max = getMaxScrollTop(candidate);
        if (max > maxScrollable) {
          maxScrollable = max;
          scrollTarget = candidate;
        }
      });

      if (!scrollTarget || maxScrollable < constants.scrollBufferPx) {
        hideScrollButtons();
        return;
      }
    } else if (!isScrollable(scrollTarget)) {
      hideScrollButtons();
      return;
    }

    const topButton = ensureScrollButton("top");
    const bottomButton = ensureScrollButton("bottom");

    const maxScrollTop = getMaxScrollTop(scrollTarget);
    setButtonVisibility(topButton, scrollTarget.scrollTop > constants.scrollBufferPx);
    setButtonVisibility(
      bottomButton,
      scrollTarget.scrollTop < maxScrollTop - constants.scrollBufferPx
    );
  }

  function applyTheme(theme) {
    if (refs.indicatorElement) {
      const userRoleStyle = deps.getRoleSurfaceStyle("user", theme);
      refs.indicatorElement.style.background = userRoleStyle.accentColor;
      refs.indicatorElement.style.boxShadow = theme.indicatorShadow;
      refs.indicatorElement.style.border = `1px solid ${userRoleStyle.borderColor}`;
    }

    const buttons = [refs.scrollToTopButton, refs.scrollToBottomButton];
    buttons.forEach((button) => {
      if (!button) return;
      button.style.background = theme.buttonBg;
      button.style.color = theme.buttonText;
      button.style.boxShadow = theme.buttonShadow;
    });
  }

  function teardown() {
    if (refs.indicatorElement && refs.indicatorElement.isConnected) {
      refs.indicatorElement.remove();
    }
    refs.indicatorElement = null;

    if (refs.scrollToTopButton && refs.scrollToTopButton.isConnected) {
      refs.scrollToTopButton.remove();
    }
    if (refs.scrollToBottomButton && refs.scrollToBottomButton.isConnected) {
      refs.scrollToBottomButton.remove();
    }
    refs.scrollToTopButton = null;
    refs.scrollToBottomButton = null;
  }

  return {
    getScrollTarget,
    getMaxScrollTop,
    isScrollable,
    ensureIndicatorElement,
    hideIndicator,
    ensureScrollButton,
    hideScrollButtons,
    updateScrollButtons,
    applyTheme,
    teardown
  };
}
