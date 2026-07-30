import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  inject,
} from '@angular/core';
import { Location } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

interface MemorizationHighlight {
  icon: string;
  title: string;
  desc: string;
}

const HIGHLIGHTS: MemorizationHighlight[] = [
  {
    icon: 'event_note',
    title: 'خطة حفظ مرنة',
    desc: 'اختر عدد الأجزاء والوتيرة التي تناسب وقتك، مع خطة واضحة تساعدك على الاستمرار.',
  },
  {
    icon: 'record_voice_over',
    title: 'تسميع ومتابعة',
    desc: 'سجّل تسميعك وتابع أداءك، واستفد من التواصل والمتابعة مع معلمك.',
  },
  {
    icon: 'analytics',
    title: 'متابعة التقدم',
    desc: 'تابع ما أتممت حفظه وما تبقى، مع تنظيم واضح للحفظ والمراجعة.',
  },
  {
    icon: 'emoji_events',
    title: 'إنجازات وشهادات',
    desc: 'احتفل بإنجازاتك واحصل على شارات وشهادات عند إتمام مراحل الحفظ.',
  },
];

@Component({
  selector: 'app-memorization-platform-page',
  standalone: true,
  imports: [MatButtonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './memorization-platform-page.component.html',
  styleUrl: './memorization-platform-page.component.scss',
})
export class MemorizationPlatformPageComponent
  implements OnInit, AfterViewInit, OnDestroy {

  private readonly location = inject(Location);

  readonly highlights = HIGHLIGHTS;

  private revealObserver?: IntersectionObserver;

  ngOnInit(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

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
      {
        threshold: 0.08,
        rootMargin: '0px 0px -50px 0px',
      }
    );

    document
      .querySelectorAll('.mp-reveal, .mp-reveal-card')
      .forEach((element) => {
        this.revealObserver?.observe(element);
      });
  }

  ngOnDestroy(): void {
    this.revealObserver?.disconnect();
  }

  goBack(): void {
    this.location.back();
  }
}