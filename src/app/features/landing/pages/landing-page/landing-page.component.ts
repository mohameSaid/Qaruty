import { Component, ChangeDetectionStrategy, AfterViewInit, OnDestroy, HostListener, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

interface CompetitionVideo {
  id: number;
  src: string;
  label: string;
}

interface Winner {
  rank: number;
  name: string;
}

interface WinnersLevel {
  level: string;
  icon: string;
  winners: Winner[];
}

interface ContactGroup {
  label: string;
  phones: string[];
}

interface PlatformFeature {
  icon: string;
  title: string;
  desc: string;
}

/** أسماء ملفات الفيديو الموجودة فعليًا في مجلد src/app/shared/assets/quran-vedio */
const VIDEO_FILE_IDS = [1, 2, 3, 4, 5, 6];

/** بيانات الفائزين — عدّل هذه المصفوفة فقط عند تحديث الأسماء لاحقًا. */
const WINNERS_LEVELS: WinnersLevel[] = [
  {
    level: 'القرآن الكريم كاملًا',
    icon: '🕋',
    winners: [
      { rank: 1, name: 'عمرو محمد احمد محمد محمد شلف' },
      { rank: 2, name: 'اسيل وجيه محمد عفيفى محمد بدر' },
      { rank: 3, name: 'عادل محمد عادل محمد عبد الرحيم' },
      { rank: 4, name: 'جنى محمد احمد محمد محمد شلف' },
      { rank: 5, name: 'كريم محمد احمد محمد محمد شلف' },
    ],
  },
  {
    level: '20 جزء',
    icon: '📖',
    winners: [
      { rank: 1, name: 'سالم اسماعيل سالم محمد سالم الصياد' },
      { rank: 2, name: 'يمنى خالد فؤاد محمد شبايك' },
      { rank: 3, name: 'يارا يحيى عبد المعطى سلوم' },
      { rank: 4, name: 'فاتن عبد الرحمن ممدوح عبد الرحمن عامر' },
      { rank: 5, name: 'روفيدا فارس أبو زكري فرج' },
    ],
  },
  {
    level: '15 جزء',
    icon: '📖',
    winners: [
      { rank: 1, name: 'رنا يوسف محمد كامل محمد شبايك' },
      { rank: 2, name: 'حذيفه السيد حماد عبد الستار حماد' },
      { rank: 3, name: 'ملك رمضان عبد العزيز على سليمان' },
      { rank: 4, name: 'جنه وليد فرج عطيه خالد' },
      { rank: 5, name: 'يوسف محمد مغربى ابو الفتوح' },
    ],
  },
  {
    level: '10 أجزاء',
    icon: '📖',
    winners: [
      { rank: 1, name: 'ياسين احمد على فرج ابو الفتوح' },
      { rank: 2, name: 'نوراى يحيى عبد المعطى سلوم' },
      { rank: 3, name: 'سلمى اسماعيل سالم محمد سالم الصياد' },
      { rank: 4, name: 'محمد احمد سعيد موسى عواد' },
      { rank: 5, name: 'فاطمه محمد ابراهيم عواد السكرى' },
    ],
  },
  {
    level: '7 أجزاء',
    icon: '📗',
    winners: [
      { rank: 1, name: 'سيلين إبراهيم أحمد إبراهيم علي' },
      { rank: 2, name: 'وفاء حماد احمد عبد الستار حماد' },
      { rank: 3, name: 'ملك محمود سعيد موسى عواد' },
      { rank: 4, name: 'آية زكريا صابر عبد الخالق قابل' },
      { rank: 5, name: 'جويريه محمد على لطفى عبد الرحمن' },
    ],
  },
  {
    level: '5 أجزاء',
    icon: '📗',
    winners: [
      { rank: 1, name: 'سندس أحمد محمد عبد الرحمن السكري' },
      { rank: 2, name: 'يوسف حسن يوسف إبراهيم عبد ربه' },
      { rank: 3, name: 'هدى بهاء شحاته رمضان' },
      { rank: 4, name: 'نورين حسام مجدى حسين الحنفى' },
      { rank: 5, name: 'سجده محمد جمعه عبد ربه حسن سالمه' },
    ],
  },
  {
    level: '3 أجزاء',
    icon: '📗',
    winners: [
      { rank: 1, name: 'سدره وليد سعيد ذكى' },
      { rank: 2, name: 'زياد رزق احمد مرسى على جبل' },
      { rank: 3, name: 'يوسف وليد فارس حجازى حسن' },
      { rank: 4, name: 'حور على عبد الرازق على محمد' },
      { rank: 5, name: 'خلود سامح المغازى سيد احمد' },
    ],
  },
];
const CONTACTS: ContactGroup[] = [
  { label: 'أرقام التواصل والاستفسارات الخاصة باللجنة', phones: ['01220918951', '01205553666', '01003922756'] },
  { label: 'دعم فني', phones: ['01003127737'] },
];

const PLATFORM_FEATURES: PlatformFeature[] = [
  { icon: '🕐', title: 'تسجيل مرن', desc: 'اختر الأوقات المناسبة لك وجدول حفظ يناسب يومك.' },
  { icon: '👨‍🏫', title: 'معلمون مجازون', desc: 'تسميع وتصحيح مباشر مع معلمين متخصصين.' },
  { icon: '📋', title: 'خطة مخصصة', desc: 'برنامج حفظ ومراجعة يناسب مستواك وهدفك.' },
  { icon: '📈', title: 'متابعة مستمرة', desc: 'متابعة تقدمك وتشجيعك خطوة بخطوة.' },
  { icon: '🎧', title: 'تسميع وتصحيح', desc: 'تعلم بطريقة تفاعلية مع ملاحظات مباشرة لتحسين الحفظ والتلاوة.' },
  { icon: '🌱', title: 'رحلة مستمرة', desc: 'احفظ، راجع، وثبّت ما حفظته حتى يصبح القرآن رفيقك.' },
];

@Component({
  selector: 'app-landing-page',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './landing-page.component.html',
  styleUrl: './landing-page.component.scss',
})
export class LandingPageComponent implements AfterViewInit, OnDestroy {
  readonly videos: CompetitionVideo[] = VIDEO_FILE_IDS.map((id) => ({
    id,
    src: `/assets/quran-videos/${id}.mp4`,
    label: `من الدورة السابقة — لقطة ${id}`,
  }));

  readonly winnersLevels = WINNERS_LEVELS;
  readonly contacts = CONTACTS;
  readonly platformFeatures = PLATFORM_FEATURES;
  readonly rankMedal: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

  /** فهرس الفيديو المعروض حاليًا في وضع ملء الشاشة، أو null إذا كان مغلقًا */
  readonly activeIndex = signal<number | null>(null);

  private revealObserver?: IntersectionObserver;
  private touchStartY = 0;
  private wheelLocked = false;
  private closingViaPopState = false;
  private readonly SWIPE_THRESHOLD = 60;

  ngAfterViewInit(): void {
    this.revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            this.revealObserver?.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -60px 0px' }
    );
    document.querySelectorAll('.reveal, .reveal-card').forEach((el) => this.revealObserver?.observe(el));
  }

  openViewer(index: number): void {
    if (this.activeIndex() === null) {
      history.pushState({ videoViewer: true }, '');
    }
    this.activeIndex.set(index);
    document.body.style.overflow = 'hidden';
  }

  closeViewer(): void {
    if (this.activeIndex() === null) return;
    this.activeIndex.set(null);
    document.body.style.overflow = '';
    if (!this.closingViaPopState) {
      history.back();
    }
  }

  @HostListener('window:popstate')
  onPopState(): void {
    if (this.activeIndex() === null) return;
    this.closingViaPopState = true;
    this.closeViewer();
    this.closingViaPopState = false;
  }

  nextVideo(): void {
    const i = this.activeIndex();
    if (i === null || i >= this.videos.length - 1) return;
    this.activeIndex.set(i + 1);
  }

  prevVideo(): void {
    const i = this.activeIndex();
    if (i === null || i <= 0) return;
    this.activeIndex.set(i - 1);
  }

  toggleViewerPlay(video: HTMLVideoElement): void {
    if (video.paused) {
      video.play().catch(() => undefined);
    } else {
      video.pause();
    }
  }

  onTouchStart(event: TouchEvent): void {
    this.touchStartY = event.touches[0].clientY;
  }

  onTouchEnd(event: TouchEvent): void {
    const diff = this.touchStartY - event.changedTouches[0].clientY;
    if (diff > this.SWIPE_THRESHOLD) {
      this.nextVideo();
    } else if (diff < -this.SWIPE_THRESHOLD) {
      this.prevVideo();
    }
  }

  onWheel(event: WheelEvent): void {
    event.preventDefault();
    if (this.wheelLocked) return;
    this.wheelLocked = true;
    if (event.deltaY > 0) {
      this.nextVideo();
    } else {
      this.prevVideo();
    }
    setTimeout(() => (this.wheelLocked = false), 450);
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (this.activeIndex() === null) return;
    if (event.key === 'Escape') this.closeViewer();
    if (event.key === 'ArrowDown') this.nextVideo();
    if (event.key === 'ArrowUp') this.prevVideo();
  }

  scrollTo(id: string, event: Event): void {
    event.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  ngOnDestroy(): void {
    this.revealObserver?.disconnect();
    document.body.style.overflow = '';
  }
}
