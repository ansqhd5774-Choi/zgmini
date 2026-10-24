'use client';

import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import styles from './about-intro-popup.module.css';

const DISMISSED_SESSION_KEY = 'zgmini-about-intro-dismissed-r1';
const HIDDEN_UNTIL_KEY = 'zgmini-about-intro-hidden-until-r1';
const SEVEN_DAYS_IN_MS = 7 * 24 * 60 * 60 * 1000;

function shouldShowIntroduction(): boolean {
  // The visitor is already reading the full introduction.
  if (window.location.pathname.replace(/\/+$/, '') === '/about') return false;

  try {
    if (window.sessionStorage.getItem(DISMISSED_SESSION_KEY) === '1') return false;
  } catch {
    // Storage can be unavailable in privacy-restricted browsing contexts.
  }

  try {
    const hiddenUntil = Number(window.localStorage.getItem(HIDDEN_UNTIL_KEY));
    if (Number.isFinite(hiddenUntil) && hiddenUntil > Date.now()) return false;
  } catch {
    // Without persistent storage, the popup still remains dismissible.
  }
  return true;
}

export default function AboutIntroPopup() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const checkboxRef = useRef<HTMLInputElement>(null);
  const [hiddenForWeek, setHiddenForWeek] = useState(false);

  const dismiss = useCallback(() => {
    try {
      window.sessionStorage.setItem(DISMISSED_SESSION_KEY, '1');
    } catch {
      // Closing must not depend on the visitor permitting Web Storage.
    }

    if (checkboxRef.current?.checked) {
      try {
        window.localStorage.setItem(HIDDEN_UNTIL_KEY, String(Date.now() + SEVEN_DAYS_IN_MS));
      } catch {
        // The popup still closes when persistence is blocked.
      }
    }
    dialogRef.current?.close();
  }, []);

  // Open before paint; unrelated passive data effects must not postpone the poster.
  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !shouldShowIntroduction()) return;
    dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-labelledby="zg-about-popup-title"
      aria-describedby="zg-about-popup-description"
      onCancel={(event) => {
        event.preventDefault();
        dismiss();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) dismiss();
      }}
    >
      <div className={styles.posterFrame}>
        <img
          className={styles.posterImage}
          src="/about-intro-popup-r1.webp"
          srcSet="/about-intro-popup-480.webp 480w, /about-intro-popup-r1.webp 1078w"
          sizes="(max-width: 600px) calc(100vw - 32px), 480px"
          width={1078}
          height={1460}
          fetchPriority="high"
          alt=""
          aria-hidden="true"
        />
        <h2 id="zg-about-popup-title" className={styles.screenReaderOnly}>제가 편하자고 만든 사이트입니다.</h2>
        <p id="zg-about-popup-description" className={styles.screenReaderOnly}>
          2016년부터 주식 투자를 하면서 확인해야 할 정보가 많았습니다.
          그래서 시장을 조금 더 쉽게 읽어보고 싶어 ZGMINI를 만들었습니다.
          부족한 점은 채팅창에 편하게 남겨주세요. 여러분 모두 부자 되세요!
        </p>
        <a
          href="/about/"
          className={styles.introLink}
          onClick={dismiss}
          aria-label="개발자 이야기 전체보기"
        >
          <span className={styles.screenReaderOnly}>개발자 이야기 전체보기</span>
        </a>
        <label className={styles.weekLabel}>
          <input
            ref={checkboxRef}
            className={styles.weekCheckbox}
            type="checkbox"
            checked={hiddenForWeek}
            onChange={(event) => setHiddenForWeek(event.target.checked)}
            aria-label="7일 동안 보지 않기"
          />
          {hiddenForWeek && <span className={styles.checkmark} aria-hidden="true">✓</span>}
          <span className={styles.screenReaderOnly}>7일 동안 보지 않기</span>
        </label>
        <button type="button" className={styles.closeButton} onClick={dismiss} aria-label="닫기">
          <span className={styles.screenReaderOnly}>닫기</span>
        </button>
      </div>
    </dialog>
  );
}
