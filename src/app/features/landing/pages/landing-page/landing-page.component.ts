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
      { rank: 1, name: 'جني مصطفي الحنفي أبو الفتوح' },
      { rank: 2, name: 'عبد الملك أسامة مصطفي الصياد' },
      { rank: 3, name: 'حبيبة رضا عبد ربه أبو الفتوح الحنفي' },
      { rank: 4, name: 'عمرو محمد إحمد شلف' },
      { rank: 5, name: 'كريم محمد أحمد شلف' },
    ],
  },
  {
    level: '20 جزء',
    icon: '📖',
    winners: [
      { rank: 1, name: 'يمني خالد فؤاد شبايك' },
      { rank: 2, name: 'تقي مصطفي الحنفي أبو الفتوح' },
      { rank: 3, name: 'يارا يحيي عبدالمعطي سلوم' },
      { rank: 4, name: 'زينب سامح احمد محمد الصياد' },
      { rank: 5, name: 'ليلي ياسر الصاوي الملعب' },
    ],
  },
  {
    level: '15 جزء',
    icon: '📖',
    winners: [
      { rank: 1, name: 'فاتن عبد الرحمن ممدوح عبد الرحمن' },
      { rank: 2, name: 'سالم إسماعيل سالم محمد' },
      { rank: 3, name: 'أسيل وجيه محمد عفيفي' },
      { rank: 4, name: 'مهند مدحت هلال أبو الحسن' },
      { rank: 5, name: 'عمر سامح زاهر عامر' },
    ],
  },
  {
    level: '10 أجزاء',
    icon: '📖',
    winners: [
      { rank: 1, name: 'رنا يوسف محمد شبايك' },
      { rank: 2, name: 'حبيبة عاصم حامد مصيلحي' },
      { rank: 3, name: 'يوسف محمد المغربي مغربي أبوالفتوح' },
      { rank: 4, name: 'ياسين أحمد علي فرج' },
      { rank: 5, name: 'حذيفة السيد حماد عبد الستار' },
    ],
  },
  {
    level: '7 أجزاء',
    icon: '📗',
    winners: [
      { rank: 1, name: 'سلمي إسماعيل سالم محمد سالم' },
      { rank: 2, name: 'محمد أبو الحسن محمد أبو الحسن الحنفي' },
      { rank: 3, name: 'نوراي يحيي عبد المعطي سلوم' },
      { rank: 4, name: 'رقية مصطفي الحنفي أبو الفتوح الحنفي' },
      { rank: 5, name: 'فجر محمد فؤاد محمد شبايك' },
    ],
  },
  {
    level: '5 أجزاء',
    icon: '📗',
    winners: [
      { rank: 1, name: 'سارة مجدي سالم الصياد' },
      { rank: 2, name: 'مريم محمد عبد العاطي سلوم' },
      { rank: 3, name: 'وفاء حماد أحمد عبد الستار' },
      { rank: 4, name: 'مالك أحمد علي فرج' },
      { rank: 5, name: 'مكة رشيد جمال رشيد سلوم' },
    ],
  },
  {
    level: '3 أجزاء',
    icon: '📗',
    winners: [
      { rank: 1, name: 'عامر وليد أحمد السيد' },
      { rank: 2, name: 'محمود زكريا صابر قابل' },
      { rank: 3, name: 'أحمد عاصم حامد مصيلحي' },
      { rank: 4, name: 'آية زكريا صابر قابل' },
      { rank: 5, name: 'عمر فارس أبو ذكري' },
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
