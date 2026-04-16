import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../core/services/toast';

@Component({
  selector: 'app-recovery-codes-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="modal-overlay" *ngIf="isOpen">
      <div class="modal-content">
        <!-- Header -->
        <div class="modal-header">
          <h2 class="modal-title">🔐 Codurile Tale de Recuperare</h2>
        </div>

        <!-- Body -->
        <div class="modal-body">
          <div class="warning-section">
            <div class="warning-icon">⚠️</div>
            <div class="warning-content">
              <h3 class="warning-title">Salvează aceste coduri în loc sigur!</h3>
              <p class="warning-text">
                Acestea sunt codurile tale unice de recuperare. Poți folosi orice cod pentru a-ți reseta parola
                dacă o uiți. Fiecare cod poate fi folosit o singură dată și nu va mai fi valabil după aceea.
              </p>
            </div>
          </div>

          <div class="codes-display">
            <h4 class="codes-title">Codurile tale:</h4>
            <div class="codes-list">
              <div *ngFor="let code of codes" class="code-line">
                <span class="code-number">•</span>
                <span class="code-value" [attr.data-code]="code">{{ formatCode(code) }}</span>
                <button 
                  type="button"
                  class="copy-btn"
                  (click)="copyCode(code)"
                  title="Copiază"
                >
                  📋
                </button>
              </div>
            </div>
          </div>

          <div class="actions">
            <button type="button" class="btn-download" (click)="downloadCodes()">
              📥 Descarcă codurile
            </button>
            <button type="button" class="btn-copy-all" (click)="copyAllCodes()">
              📋 Copiază toate
            </button>
          </div>

          <div class="info-box">
            <p class="info-text">
              <strong>Sfat:</strong> Poți nota aceste coduri pe o foi de hârtie și o ține în loc sigur, sau le salvezi într-un manager de parole.
            </p>
          </div>
        </div>

        <!-- Footer -->
        <div class="modal-footer">
          <button type="button" class="btn-primary" (click)="continueToProfile()">
            Continuă la profilul meu
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(0, 0, 0, 0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2000;
    }

    .modal-content {
      background: white;
      border-radius: 16px;
      box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
      width: 90%;
      max-width: 600px;
      max-height: 85vh;
      overflow-y: auto;
    }

    .modal-header {
      padding: 28px 24px;
      border-bottom: 1px solid #e5e7eb;
      background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
    }

    .modal-title {
      font-size: 1.5rem;
      font-weight: 700;
      color: white;
      margin: 0;
    }

    .modal-body {
      padding: 28px 24px;
    }

    .warning-section {
      display: flex;
      gap: 16px;
      background: #fef3c7;
      border: 1px solid #fcd34d;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 24px;
    }

    .warning-icon {
      font-size: 1.5rem;
      flex-shrink: 0;
    }

    .warning-content {
      flex: 1;
    }

    .warning-title {
      font-size: 0.875rem;
      font-weight: 700;
      color: #92400e;
      margin: 0 0 8px 0;
    }

    .warning-text {
      font-size: 0.875rem;
      color: #b45309;
      line-height: 1.5;
      margin: 0;
    }

    .codes-display {
      margin-bottom: 24px;
    }

    .codes-title {
      font-size: 0.875rem;
      font-weight: 600;
      color: #374151;
      margin: 0 0 12px 0;
    }

    .codes-list {
      background: #f3f4f6;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      font-family: 'Courier New', monospace;
    }

    .code-line {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 12px;
      background: white;
      border-radius: 4px;
      border: 1px solid #e5e7eb;
    }

    .code-number {
      color: #6b7280;
      font-weight: 700;
      font-size: 0.75rem;
    }

    .code-value {
      font-weight: 600;
      color: #111827;
      font-size: 0.8125rem;
      flex: 1;
      letter-spacing: 0.5px;
    }

    .copy-btn {
      background: none;
      border: none;
      font-size: 1rem;
      cursor: pointer;
      padding: 4px;
      transition: transform 0.1s;
    }

    .copy-btn:hover {
      transform: scale(1.2);
    }

    .actions {
      display: flex;
      gap: 12px;
      margin-bottom: 16px;
    }

    .btn-download,
    .btn-copy-all {
      flex: 1;
      padding: 10px 16px;
      border-radius: 6px;
      border: 1px solid #d1d5db;
      background: white;
      color: #374151;
      font-weight: 600;
      font-size: 0.875rem;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-download:hover,
    .btn-copy-all:hover {
      background: #f3f4f6;
      border-color: #9ca3af;
    }

    .info-box {
      background: #dbeafe;
      border: 1px solid #93c5fd;
      border-radius: 6px;
      padding: 12px 16px;
      margin-bottom: 16px;
    }

    .info-text {
      font-size: 0.875rem;
      color: #1e40af;
      line-height: 1.5;
      margin: 0;
    }

    .modal-footer {
      padding: 20px 24px;
      border-top: 1px solid #e5e7eb;
      display: flex;
      justify-content: flex-end;
    }

    .btn-primary {
      padding: 12px 28px;
      background-color: #22c55e;
      color: white;
      border: none;
      border-radius: 6px;
      font-weight: 600;
      font-size: 0.875rem;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-primary:hover {
      background-color: #16a34a;
    }

    .btn-primary:active {
      transform: scale(0.98);
    }
  `]
})
export class RecoveryCodesModal {
  @Input() isOpen = false;
  @Input() codes: string[] = [];
  @Output() onContinue = new EventEmitter<void>();

  private toastService = inject(ToastService);

  copyCode(code: string) {
    navigator.clipboard.writeText(code).then(() => {
      this.toastService.show('Cod copiat!', 'success');
    }).catch(() => {
      this.toastService.show('Eroare la copiere.', 'error');
    });
  }

  copyAllCodes() {
    const allCodes = this.codes.join('\n');
    navigator.clipboard.writeText(allCodes).then(() => {
      this.toastService.show('Toate codurile au fost copiate!', 'success');
    }).catch(() => {
      this.toastService.show('Eroare la copiere.', 'error');
    });
  }

  downloadCodes() {
    const content = `Codurile tale de recuperare\n${'='.repeat(40)}\n\n${this.codes.join('\n')}\n\n${'='.repeat(40)}\nSalvează-le în loc sigur!`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'recovery-codes.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    this.toastService.show('Codurile au fost descărcate!', 'success');
  }

  formatCode(code: string): string {
    if (!code || code.length !== 10) return code;
    return `${code.substring(0, 4)}-${code.substring(4, 8)}-${code.substring(8)}`;
  }

  continueToProfile() {
    this.onContinue.emit();
  }
}
