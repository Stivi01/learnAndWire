import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth';

export interface RecoveryCode {
  Id: number;
  Code: string;
  IsUsed: boolean;
  UsedAt: string | null;
  CreatedAt: string;
  ExpiresAt: string;
}

export interface GenerateCodesResponse {
  message: string;
  codes: string[];
  warning?: string;
}

export interface VerifyCodeResponse {
  message: string;
}

export interface RecoveryStatusResponse {
  unusedCount: number;
}

@Injectable({
  providedIn: 'root'
})
export class RecoveryService {
  private apiUrl = 'http://localhost:3000/api/recovery';

  constructor(private http: HttpClient, private authService: AuthService) {}

  private getAuthHeaders() {
    const token = this.authService.getToken();
    return {
      headers: new HttpHeaders({
        Authorization: `Bearer ${token}`,
      }),
    };
  }

  /**
   * Generate initial recovery codes (called during registration)
   */
  generateInitialCodes(): Observable<GenerateCodesResponse> {
    return this.http.post<GenerateCodesResponse>(
      `${this.apiUrl}/generate-initial`,
      {},
      this.getAuthHeaders()
    );
  }

  /**
   * Verify recovery code and reset password
   * Called from "Forgot Password" page without authentication
   */
  verifyCode(email: string, code: string, newPassword: string): Observable<VerifyCodeResponse> {
    return this.http.post<VerifyCodeResponse>(`${this.apiUrl}/verify`, {
      email,
      code: code.toUpperCase(),
      newPassword
    });
  }

  /**
   * Get all recovery codes for authenticated user
   */
  getCodes(): Observable<RecoveryCode[]> {
    return this.http.get<RecoveryCode[]>(
      `${this.apiUrl}/codes`,
      this.getAuthHeaders()
    );
  }

  /**
   * Regenerate recovery codes (from settings)
   */
  regenerateCodes(): Observable<GenerateCodesResponse> {
    return this.http.post<GenerateCodesResponse>(
      `${this.apiUrl}/regenerate`,
      {},
      this.getAuthHeaders()
    );
  }

  /**
   * Get count of unused recovery codes
   */
  getStatus(): Observable<RecoveryStatusResponse> {
    return this.http.get<RecoveryStatusResponse>(
      `${this.apiUrl}/status`,
      this.getAuthHeaders()
    );
  }

  /**
   * Utility: Format code with dashes for display (ABC3-D4EF-GH pattern)
   */
  formatCodeForDisplay(code: string): string {
    if (!code || code.length !== 10) return code;
    return `${code.substring(0, 4)}-${code.substring(4, 8)}-${code.substring(8)}`;
  }

  /**
   * Utility: Copy code to clipboard
   */
  copyToClipboard(text: string): Promise<void> {
    return navigator.clipboard.writeText(text);
  }
}
