// Notification utilities
let notificationPermissionRequested = false;

export const requestNotificationPermission = async () => {
  if (!("Notification" in window)) {
    console.warn("This browser does not support notifications");
    return false;
  }

  if (Notification.permission === "granted") {
    return true;
  }

  if (!notificationPermissionRequested) {
    notificationPermissionRequested = true;
    const permission = await Notification.requestPermission();
    return permission === "granted";
  }

  return false;
};

export const showNotification = (title, options = {}) => {
  if (!("Notification" in window)) return;

  if (Notification.permission === "granted") {
    new Notification(title, options);
    return true;
  }

  return false;
};

// Audio utilities
let audioContext;
let notificationSound;
let audioInitialized = false;

export const initAudio = () => {
  if (audioInitialized) return;
  audioInitialized = true;

  try {
    // Prefer Web Audio API but fallback to HTML5 Audio
    if (window.AudioContext || window.webkitAudioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    } else {
      notificationSound = new Audio('/sounds/notification.mp3');
      notificationSound.load();
    }
  } catch (error) {
    console.error("Audio initialization failed:", error);
  }
};

export const playNotificationSound = async () => {
  try {
    // Try Web Audio API first
    if (audioContext) {
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      // Only load the sound when first needed
      if (!notificationSound) {
        const response = await fetch('/sounds/notification.mp3');
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);
        source.start(0);
        return;
      }
    }

    // Fallback to HTML5 Audio
    const audio = new Audio('/sounds/notification.mp3');
    await audio.play().catch(err => {
      console.error("Audio playback failed:", err);
    });
  } catch (error) {
    console.error("Error playing notification sound:", error);
  }
};

// Enhanced time formatting
export function formatMessageTime(date) {
  const messageDate = new Date(date);
  const now = new Date();
  const diffDays = Math.floor((now - messageDate) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return messageDate.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } else if (diffDays === 1) {
    return "Yesterday";
  } else if (diffDays < 7) {
    return messageDate.toLocaleDateString("en-US", { weekday: "short" });
  } else {
    return messageDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  }
}