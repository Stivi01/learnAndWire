import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RecoveryService, RecoveryCode } from '../../../core/services/recovery';
import { ToastService } from '../../../core/services/toast';

@Component({
  selector: 'app-recovery-codes-settings',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="recovery-codes-section">
      <div class="section-header">
        <h3 class="section-title">
          <span class="icon">🔐</span> Coduri de Recuperare
        </h3>
        <p class="section-description">
          Folosește aceste coduri pentru a-ți reseta parola dacă o uiți.
        </p>
      </div>

      <!-- Loading State -->
      <div *ngIf="isLoading()" class="loading-state">
        <p>Se încarcă codurile...</p>
      </div>

      <!-- Error State -->
      <div *ngIf="!isLoading() && error()" class="error-state">
        <p>{{ error() }}</p>
        <button (click)="loadCodes()" class="retry-button">Încearcă din nou</button>
      </div>

      <!-- Codes List -->
      <div *ngIf="!isLoading() && !error() && codes().length > 0" class="codes-container">
        
        <!-- Status Bar -->
        <div class="status-bar">
          <div class="status-info">
            <span class="status-label">Coduri disponibile:</span>
            <span class="status-value">{{ unusedCount() }} / {{ codes().length }}</span>
          </div>
          <button (click)="openShowAllModal()" class="view-all-button">
            Afișează toate
          </button>
        </div>

        <!-- Unused Codes Preview -->
        <div class="codes-preview">
          <h4 class="preview-title">Coduri nefolosite:</h4>
          <div class="codes-grid">
            <div *ngFor="let code of getUnusedCodes().slice(0, 5)" class="code-item">
              <span class="code-display">{{ formatCode(code.Code) }}</span>
              <button 
                type="button"
                class="copy-button"
                (click)="copyCode(code.Code)"
                title="Copiază codul"
              >
                <span class="copy-icon">📋</span>
              </button>
            </div>
            <div *ngIf="getUnusedCodes().length > 5" class="code-item more-indicator">
              +{{ getUnusedCodes().length - 5 }} mai mult
            </div>
          </div>
        </div>

        <!-- Warning -->
        <div class="warning-box">
          <span class="warning-icon">⚠️</span>
          <p class="warning-text">
            Fiecare cod poate fi folosit o singură dată. Nu și-i comunica cu nimeni și păstrează-i în loc sigur.
          </p>
        </div>
      </div>

      <!-- Empty State -->
      <div *ngIf="!isLoading() && !error() && codes().length === 0" class="empty-state">
        <p>Nu ai coduri de recuperare generate.</p>
      </div>

      <!-- Action Buttons -->
      <div class="action-buttons">
        <button 
          (click)="regenerateCodes()" 
          [disabled]="isRegenerating()"
          class="regenerate-button"
        >
          <span class="button-icon">🔄</span>
          {{ isRegenerating() ? 'Se regenerează...' : 'Regenerează Coduri' }}
        </button>
      </div>
    </div>

    <!-- Modal for All Codes -->
    <div class="modal-overlay" *ngIf="showAllModal()" (click)="closeShowAllModal()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h3 class="modal-title">Toate Codurile de Recuperare</h3>
          <button type="button" class="close-button" (click)="closeShowAllModal()">×</button>
        </div>
        <div class="modal-body">
          <div class="all-codes-list">
            <div *ngFor="let code of codes()" class="single-code-row">
              <span class="code-text">{{ formatCode(code.Code) }}</span>
              <div class="code-status">
                <span *ngIf="!code.IsUsed" class="badge-unused">Neutilizat</span>
                <span *ngIf="code.IsUsed" class="badge-used">Folosit pe {{ formatDate(code.UsedAt) }}</span>
              </div>
              <button 
                type="button"
                class="copy-button-small"
                (click)="copyCode(code.Code)"
              >
                📋
              </button>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="close-modal-button" (click)="closeShowAllModal()">
            Închide
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .recovery-codes-section {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 24px;
      margin: 20px 0;
    }

    .section-header {
      margin-bottom: 20px;
    }

    .section-title {
      font-size: 1.25rem;
      font-weight: 700;
      color: #111827;
      margin: 0 0 8px 0;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .icon {
      font-size: 1.5rem;
    }

    .section-description {
      color: #6b7280;
      font-size: 0.875rem;
      margin: 0;
    }

    .loading-state,
    .error-state,
    .empty-state {
      text-align: center;
      padding: 20px;
      color: #6b7280;
      font-size: 0.875rem;
    }

    .error-state {
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 6px;
      margin-bottom: 16px;
    }

    .retry-button {
      margin-top: 12px;
      padding: 8px 16px;
      background-color: #ef4444;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.875rem;
    }

    .codes-container {
      margin-bottom: 20px;
    }

    .status-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      margin-bottom: 16px;
    }

    .status-info {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .status-label {
      color: #6b7280;
      font-size: 0.875rem;
      font-weight: 500;
    }

    .status-value {
      font-weight: 700;
      color: #22c55e;
      font-size: 0.875rem;
    }

    .view-all-button {
      padding: 6px 12px;
      background-color: #f3f4f6;
      border: 1px solid #d1d5db;
      border-radius: 4px;
      color: #374151;
      font-size: 0.75rem;
      cursor: pointer;
      transition: all 0.2s;
    }

    .view-all-button:hover {
      background-color: #e5e7eb;
    }

    .codes-preview {
      margin-bottom: 16px;
    }

    .preview-title {
      font-size: 0.875rem;
      font-weight: 600;
      color: #374151;
      margin: 0 0 12px 0;
    }

    .codes-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
      gap: 12px;
    }

    .code-item {
      background: white;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      padding: 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
    }

    .code-display {
      font-family: 'Courier New', monospace;
      font-size: 0.8125rem;
      font-weight: 600;
      color: #111827;
    }

    .copy-button,
    .copy-button-small {
      background: none;
      border: none;
      font-size: 1rem;
      cursor: pointer;
      padding: 4px;
      transition: transform 0.1s;
    }

    .copy-button:hover,
    .copy-button-small:hover {
      transform: scale(1.2);
    }

    .more-indicator {
      color: #6b7280;
      font-weight: 600;
      justify-content: center;
    }

    .warning-box {
      display: flex;
      gap: 12px;
      background: #fef3c7;
      border: 1px solid #fcd34d;
      border-radius: 6px;
      padding: 12px 16px;
    }

    .warning-icon {
      font-size: 1.25rem;
    }

    .warning-text {
      margin: 0;
      font-size: 0.875rem;
      color: #92400e;
      line-height: 1.5;
    }

    .action-buttons {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      margin-top: 20px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
    }

    .regenerate-button {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 20px;
      background-color: #22c55e;
      color: white;
      border: none;
      border-radius: 6px;
      font-weight: 600;
      font-size: 0.875rem;
      cursor: pointer;
      transition: all 0.2s;
    }

    .regenerate-button:hover:not(:disabled) {
      background-color: #16a34a;
    }

    .regenerate-button:disabled {
      background-color: #d1d5db;
      cursor: not-allowed;
    }

    .button-icon {
      font-size: 1.125rem;
    }

    /* Modal Styles */
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .modal-content {
      background: white;
      border-radius: 12px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      width: 90%;
      max-width: 600px;
      max-height: 80vh;
      overflow-y: auto;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px 24px;
      border-bottom: 1px solid #e5e7eb;
    }

    .modal-title {
      font-size: 1.25rem;
      font-weight: 700;
      color: #111827;
      margin: 0;
    }

    .close-button {
      background: none;
      border: none;
      font-size: 1.5rem;
      color: #6b7280;
      cursor: pointer;
      padding: 0;
    }

    .close-button:hover {
      color: #111827;
    }

    .modal-body {
      padding: 20px 24px;
    }

    .all-codes-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .single-code-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
    }

    .code-text {
      font-family: 'Courier New', monospace;
      font-weight: 600;
      color: #111827;
    }

    .code-status {
      display: flex;
      gap: 8px;
    }

    .badge-unused {
      background: #dcfce7;
      color: #166534;
      padding: 4px 12px;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .badge-used {
      background: #fee2e2;
      color: #991b1b;
      padding: 4px 12px;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      padding: 16px 24px;
      border-top: 1px solid #e5e7eb;
    }

    .close-modal-button {
      padding: 10px 20px;
      background-color: #f3f4f6;
      color: #374151;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      font-weight: 600;
      font-size: 0.875rem;
      cursor: pointer;
      transition: all 0.2s;
    }

    .close-modal-button:hover {
      background-color: #e5e7eb;
    }
  `]
})
export class RecoveryCodesSettings implements OnInit {
  private recoveryService = inject(RecoveryService);
  private toastService = inject(ToastService);

  codes = signal<RecoveryCode[]>([]);
  isLoading = signal(true);
  isRegenerating = signal(false);
  error = signal<string | null>(null);
  showAllModal = signal(false);
  unusedCount = signal(0);

  ngOnInit() {
    this.loadCodes();
  }

  loadCodes() {
    this.isLoading.set(true);
    this.error.set(null);

    this.recoveryService.getCodes().subscribe({
      next: (data: any) => {
        this.codes.set(data);
        this.updateUnusedCount();
        this.isLoading.set(false);
      },
      error: (err: any) => {
        this.error.set(err.error?.message || 'Eroare la încărcarea codurilor.');
        this.isLoading.set(false);
      }
    });
  }

  regenerateCodes() {
    if (confirm('Ești sigur că vrei să regenerezi codurile? Codurile vechi nu vor mai funcționa.')) {
      this.isRegenerating.set(true);

      this.recoveryService.regenerateCodes().subscribe({
        next: (response: any) => {
          this.isRegenerating.set(false);
          this.toastService.show(response.message, 'success');
          
          // Reload codes
          this.loadCodes();
          
          // Show new codes in modal
          this.showNewCodesModal(response.codes);
        },
        error: (err: any) => {
          this.isRegenerating.set(false);
          const msg = err.error?.message || 'Eroare la regenerarea codurilor.';
          this.toastService.show(msg, 'error');
        }
      });
    }
  }

  private showNewCodesModal(newCodes: string[]) {
    // Show modal with new codes
    const codesText = newCodes.join('\n');
    alert(`Coduri noi generate:\n\n${codesText}\n\nSalvează-le într-un loc sigur!`);
  }

  getUnusedCodes(): RecoveryCode[] {
    return this.codes().filter(c => !c.IsUsed);
  }

  formatCode(code: string): string {
    return this.recoveryService.formatCodeForDisplay(code);
  }

  formatDate(date: string | null): string {
    if (!date) return '';
    const d = new Date(date);
    // Foloseste UTC pentru a evita schimbarea zilei din cauza timezone
    const year = d.getUTCFullYear();
    const month = (d.getUTCMonth() + 1).toString().padStart(2, '0');
    const day = d.getUTCDate().toString().padStart(2, '0');
    return `${day}.${month}.${year}`;
  }

  copyCode(code: string) {
    this.recoveryService.copyToClipboard(code).then(() => {
      this.toastService.show('Cod copiat în clipboard!', 'success');
    }).catch(() => {
      this.toastService.show('Eroare la copiere.', 'error');
    });
  }

  openShowAllModal() {
    this.showAllModal.set(true);
  }

  closeShowAllModal() {
    this.showAllModal.set(false);
  }

  private updateUnusedCount() {
    this.unusedCount.set(this.getUnusedCodes().length);
  }
}
