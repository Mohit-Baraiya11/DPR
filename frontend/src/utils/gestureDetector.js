// Gesture detection utilities for mobile interactions
export class GestureDetector {
  constructor(element, options = {}) {
    this.element = element;
    this.options = {
      swipeThreshold: 50,
      longPressDelay: 500,
      pullThreshold: 80,
      ...options
    };
    
    this.touchStart = null;
    this.touchEnd = null;
    this.longPressTimer = null;
    this.isLongPress = false;
    this.pullStartY = null;
    this.pullDistance = 0;
    
    this.callbacks = {
      onSwipeLeft: null,
      onSwipeRight: null,
      onSwipeUp: null,
      onSwipeDown: null,
      onLongPress: null,
      onPullStart: null,
      onPullMove: null,
      onPullEnd: null,
      onTap: null
    };
    
    this.init();
  }
  
  init() {
    this.element.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
    this.element.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
    this.element.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
    this.element.addEventListener('touchcancel', this.handleTouchCancel.bind(this), { passive: false });
  }
  
  handleTouchStart(e) {
    this.touchStart = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      time: Date.now()
    };
    
    this.pullStartY = e.touches[0].clientY;
    this.pullDistance = 0;
    this.isLongPress = false;
    
    // Start long press timer
    this.longPressTimer = setTimeout(() => {
      this.isLongPress = true;
      this.callbacks.onLongPress?.(e);
      this.triggerHapticFeedback('medium');
    }, this.options.longPressDelay);
    
    // Check if this is a pull-to-refresh start
    if (this.isAtTop() && this.callbacks.onPullStart) {
      this.callbacks.onPullStart(e);
    }
  }
  
  handleTouchMove(e) {
    if (!this.touchStart) return;
    
    const touch = e.touches[0];
    const deltaX = touch.clientX - this.touchStart.x;
    const deltaY = touch.clientY - this.touchStart.y;
    
    // Cancel long press if moved too much
    if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
      if (this.longPressTimer) {
        clearTimeout(this.longPressTimer);
        this.longPressTimer = null;
      }
    }
    
    // Handle pull-to-refresh
    if (this.isAtTop() && deltaY > 0) {
      this.pullDistance = deltaY;
      if (this.callbacks.onPullMove) {
        this.callbacks.onPullMove(e, deltaY);
      }
      
      // Prevent default scrolling when pulling
      if (deltaY > 10) {
        e.preventDefault();
      }
    }
  }
  
  handleTouchEnd(e) {
    if (!this.touchStart) return;
    
    this.touchEnd = {
      x: e.changedTouches[0].clientX,
      y: e.changedTouches[0].clientY,
      time: Date.now()
    };
    
    // Clear long press timer
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
    
    const deltaX = this.touchEnd.x - this.touchStart.x;
    const deltaY = this.touchEnd.y - this.touchStart.y;
    const deltaTime = this.touchEnd.time - this.touchStart.time;
    
    // Handle pull-to-refresh end
    if (this.isAtTop() && this.pullDistance > 0) {
      if (this.callbacks.onPullEnd) {
        this.callbacks.onPullEnd(e, this.pullDistance);
      }
      this.pullDistance = 0;
      return;
    }
    
    // Detect swipes (only if not a long press and quick enough)
    if (!this.isLongPress && deltaTime < 300) {
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        // Horizontal swipe
        if (Math.abs(deltaX) > this.options.swipeThreshold) {
          if (deltaX > 0) {
            this.callbacks.onSwipeRight?.(e);
            this.triggerHapticFeedback('light');
          } else {
            this.callbacks.onSwipeLeft?.(e);
            this.triggerHapticFeedback('light');
          }
        }
      } else {
        // Vertical swipe
        if (Math.abs(deltaY) > this.options.swipeThreshold) {
          if (deltaY > 0) {
            this.callbacks.onSwipeDown?.(e);
          } else {
            this.callbacks.onSwipeUp?.(e);
          }
        }
      }
    }
    
    // Handle tap (if no significant movement)
    if (Math.abs(deltaX) < 10 && Math.abs(deltaY) < 10 && !this.isLongPress) {
      this.callbacks.onTap?.(e);
    }
    
    this.touchStart = null;
    this.touchEnd = null;
    this.isLongPress = false;
  }
  
  handleTouchCancel(e) {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
    this.touchStart = null;
    this.touchEnd = null;
    this.isLongPress = false;
    this.pullDistance = 0;
  }
  
  isAtTop() {
    return this.element.scrollTop === 0;
  }
  
  triggerHapticFeedback(type = 'light') {
    if ('vibrate' in navigator) {
      switch (type) {
        case 'light':
          navigator.vibrate(10);
          break;
        case 'medium':
          navigator.vibrate(50);
          break;
        case 'heavy':
          navigator.vibrate([50, 30, 50]);
          break;
        case 'success':
          navigator.vibrate([50, 30, 50, 30, 50]);
          break;
        case 'error':
          navigator.vibrate([100, 50, 100]);
          break;
      }
    }
  }
  
  on(event, callback) {
    if (this.callbacks[event]) {
      this.callbacks[event] = callback;
    }
  }
  
  destroy() {
    this.element.removeEventListener('touchstart', this.handleTouchStart);
    this.element.removeEventListener('touchmove', this.handleTouchMove);
    this.element.removeEventListener('touchend', this.handleTouchEnd);
    this.element.removeEventListener('touchcancel', this.handleTouchCancel);
    
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
    }
  }
}

// Utility function to create haptic feedback
export const triggerHaptic = (type = 'light') => {
  if ('vibrate' in navigator) {
    switch (type) {
      case 'light':
        navigator.vibrate(10);
        break;
      case 'medium':
        navigator.vibrate(50);
        break;
      case 'heavy':
        navigator.vibrate([50, 30, 50]);
        break;
      case 'success':
        navigator.vibrate([50, 30, 50, 30, 50]);
        break;
      case 'error':
        navigator.vibrate([100, 50, 100]);
        break;
    }
  }
};
