import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, from, of, throwError, timer } from 'rxjs';
import { catchError, delay, map, retry, switchMap, timeout } from 'rxjs/operators';
import { createDemoGeneratedImage } from './demo-art';
import { AiError } from './models/ai.models';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AiImageService {
  readonly modelLabel = 'Stable Diffusion XL';

  constructor(private readonly http: HttpClient) {}

  get isDemoMode(): boolean {
    return environment.aiMode === 'demo';
  }

  generate(prompt: string, parameters: { guidanceScale: number; steps: number }, sourceImage: string | null = null): Observable<{ dataUrl: string; source: 'api' | 'demo' }> {
    if (this.isDemoMode) {
      return of({ dataUrl: createDemoGeneratedImage(prompt), source: 'demo' as const }).pipe(delay(950));
    }

    const body = {
      ...(sourceImage ? { prompt, source_image: sourceImage } : { inputs: prompt }),
      parameters: {
        guidance_scale: parameters.guidanceScale,
        num_inference_steps: parameters.steps
      }
    };

    return this.http
      .post(environment.aiApiUrl, body, {
        observe: 'response',
        responseType: 'blob'
      })
      .pipe(
        timeout(45000),
        retry({
          count: 2,
          delay: (error: HttpErrorResponse, retryCount: number) => {
            if (!this.isRetryable(error) || retryCount > 2) {
              return throwError(() => error);
            }
            return timer(500 * 2 ** retryCount);
          }
        }),
        switchMap((response) => this.readResponse(response.body)),
        map((dataUrl) => ({ dataUrl, source: 'api' as const })),
        catchError((error: unknown) => throwError(() => this.toAiError(error)))
      );
  }

  private isRetryable(error: HttpErrorResponse): boolean {
    return error.status === 0 || error.status >= 500 || error.status === 408;
  }

  private readResponse(blob: Blob | null): Observable<string> {
    if (!blob) {
      return throwError(() => new Error('The AI service returned an empty response.'));
    }

    return from(this.parseResponse(blob));
  }

  private async parseResponse(blob: Blob): Promise<string> {
      const contentType = blob.type || '';
      if (contentType.startsWith('image/')) {
        return this.blobToDataUrl(blob);
      }

      const text = await blob.text();
      try {
        const payload = JSON.parse(text) as { image?: string; data?: string; error?: string };
        const base64 = payload.image ?? payload.data;
        if (base64) {
          return base64.startsWith('data:') ? base64 : `data:image/png;base64,${base64}`;
        }
        throw new Error(payload.error ?? 'The AI service returned an invalid image response.');
      } catch (error) {
        throw error instanceof Error ? error : new Error('The AI service returned an invalid response.');
      }
  }

  private blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('The generated image could not be read.'));
      reader.readAsDataURL(blob);
    });
  }

  private toAiError(error: unknown): AiError {
    const httpError = error as HttpErrorResponse;
    const status = typeof httpError?.status === 'number' ? httpError.status : 0;

    if (status === 401 || status === 403) {
      return { title: 'Authentication needed', message: 'Configure a valid Hugging Face token in server/.env or the deployment environment before generating.', retryable: false };
    }
    if (status === 402) {
      return { title: 'Usage quota exhausted', message: 'Hugging Face Inference Providers monthly credits are exhausted. Add credits or use another provider.', retryable: false };
    }
    if (status === 429) {
      return { title: 'Rate limit reached', message: 'The model quota is busy. Wait a moment and try again.', retryable: true };
    }
    if (status === 0) {
      return { title: 'Connection issue', message: 'The AI service could not be reached. Check your network and retry.', retryable: true };
    }
    if (status >= 500) {
      return { title: 'Model unavailable', message: 'The model is temporarily unavailable. Please retry shortly.', retryable: true };
    }
    if (error && typeof error === 'object' && 'title' in error && 'message' in error) {
      return error as AiError;
    }
    return { title: 'Generation failed', message: 'The image could not be generated. Try a shorter Prompt.', retryable: true };
  }
}
