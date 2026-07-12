import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  TemplateRef,
  ViewChild,
  ViewContainerRef,
  computed,
  forwardRef,
  inject,
  input,
  signal,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { NG_VALUE_ACCESSOR, ControlValueAccessor } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ConnectedPosition, Overlay, OverlayRef } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';

import { LookupItem } from '../../../features/users/models/lookup.model';

/**
 * Dropdown "tree select" for hierarchical lookups (e.g. `/lookup/studyLevel?withChildren=true`,
 * which returns educational stage -> grade). Works as a `ControlValueAccessor`, so it plugs into
 * a reactive form the same way a `mat-select` would: `<app-tree-select formControlName="..." [nodes]="..." />`.
 *
 * Clicking a row selects it and closes the panel (assigning that node's `id` as the control
 * value); clicking the chevron on a row with children only expands/collapses it. Any node —
 * not just leaves — can be selected, since the backend field this feeds (`studyYearId`) isn't
 * confirmed to require a leaf specifically.
 *
 * The panel is rendered through the CDK overlay (portaled to the end of `<body>`) instead of as
 * an absolutely positioned child. That means it can't get clipped by an ancestor's
 * `overflow: hidden` (e.g. the `.section-card` wrapper this sits in on the registration form),
 * and it flips to open upward — with its height capped to whatever viewport space is actually
 * available — when there isn't room below the trigger.
 */
@Component({
  selector: 'app-tree-select',
  standalone: true,
  imports: [MatIconModule, NgTemplateOutlet],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => TreeSelectComponent),
      multi: true,
    },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './tree-select.component.html',
  styleUrl: './tree-select.component.scss',
})
export class TreeSelectComponent implements ControlValueAccessor, OnDestroy {
  readonly nodes = input<LookupItem[]>([]);
  readonly label = input('اختر');
  readonly placeholder = input('اختر من القائمة');
  readonly clearable = input(true);

  @ViewChild('trigger', { static: true }) private readonly triggerRef!: ElementRef<HTMLElement>;
  @ViewChild('panelTpl', { static: true }) private readonly panelTpl!: TemplateRef<unknown>;

  private readonly overlay = inject(Overlay);
  private readonly viewContainerRef = inject(ViewContainerRef);
  private overlayRef: OverlayRef | null = null;

  readonly open = signal(false);
  /** Whether the panel ended up flipped above the trigger (not enough room below). */
  readonly openAbove = signal(false);
  readonly disabled = signal(false);
  readonly expandedIds = signal<Set<number>>(new Set());
  readonly selectedId = signal<number | null>(null);

  readonly selectedLabel = computed(() => {
    const id = this.selectedId();
    if (id == null) {
      return '';
    }
    return this.findPath(this.nodes(), id) ?? '';
  });

  private onChange: (value: number | null) => void = () => {};
  private onTouched: () => void = () => {};

  toggleOpen(): void {
    if (this.disabled()) {
      return;
    }
    if (this.open()) {
      this.closePanel();
    } else {
      this.openPanel();
    }
  }

  toggleExpand(node: LookupItem, event: MouseEvent): void {
    event.stopPropagation();
    this.expandedIds.update((set) => {
      const next = new Set(set);
      if (next.has(node.id)) {
        next.delete(node.id);
      } else {
        next.add(node.id);
      }
      return next;
    });
  }

  isExpanded(node: LookupItem): boolean {
    return this.expandedIds().has(node.id);
  }

  hasChildren(node: LookupItem): boolean {
    return !!node.children?.length;
  }

  selectNode(node: LookupItem): void {
    this.selectedId.set(node.id);
    this.onChange(node.id);
    this.closePanel();
  }

  clearSelection(event: MouseEvent): void {
    event.stopPropagation();
    this.selectedId.set(null);
    this.onChange(null);
    this.onTouched();
  }

  ngOnDestroy(): void {
    this.overlayRef?.dispose();
  }

  private openPanel(): void {
    const positions: ConnectedPosition[] = [
      { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 4 },
      { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetY: -4 },
    ];

    const positionStrategy = this.overlay
      .position()
      .flexibleConnectedTo(this.triggerRef)
      .withPositions(positions)
      .withViewportMargin(8)
      .withFlexibleDimensions(true)
      .withGrowAfterOpen(true)
      .withPush(true);

    positionStrategy.positionChanges.subscribe((change) => {
      this.openAbove.set(change.connectionPair.overlayY === 'bottom');
    });

    this.overlayRef = this.overlay.create({
      positionStrategy,
      scrollStrategy: this.overlay.scrollStrategies.reposition({ scrollThrottle: 20 }),
      hasBackdrop: true,
      backdropClass: 'cdk-overlay-transparent-backdrop',
      width: this.triggerRef.nativeElement.getBoundingClientRect().width,
    });

    this.overlayRef.backdropClick().subscribe(() => this.closePanel());
    this.overlayRef.keydownEvents().subscribe((event) => {
      if (event.key === 'Escape') {
        this.closePanel();
      }
    });

    this.overlayRef.attach(new TemplatePortal(this.panelTpl, this.viewContainerRef));
    this.open.set(true);
  }

  private closePanel(): void {
    if (!this.overlayRef) {
      return;
    }
    this.overlayRef.dispose();
    this.overlayRef = null;
    this.open.set(false);
    this.onTouched();
  }

  private findPath(nodes: LookupItem[], id: number, trail: string[] = []): string | null {
    for (const node of nodes) {
      const path = [...trail, node.name.arabic];
      if (node.id === id) {
        return path.join(' > ');
      }
      if (node.children?.length) {
        const found = this.findPath(node.children, id, path);
        if (found) {
          return found;
        }
      }
    }
    return null;
  }

  // ----- ControlValueAccessor -----

  writeValue(value: number | null): void {
    this.selectedId.set(value);
  }

  registerOnChange(fn: (value: number | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
    if (isDisabled) {
      this.closePanel();
    }
  }
}
