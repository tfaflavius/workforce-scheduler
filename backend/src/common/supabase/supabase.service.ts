import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  private supabase: SupabaseClient;

  constructor(private configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseServiceKey = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY');

    this.supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  getClient(): SupabaseClient {
    return this.supabase;
  }

  async signUp(email: string, password: string, metadata?: Record<string, any>) {
    const { data, error } = await this.supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: metadata,
    });

    if (error) {
      throw error;
    }

    return data;
  }

  async signIn(email: string, password: string) {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw error;
    }

    return data;
  }

  async getUser(token: string) {
    const { data, error } = await this.supabase.auth.getUser(token);

    if (error) {
      throw error;
    }

    return data.user;
  }

  async deleteUser(userId: string) {
    const { error } = await this.supabase.auth.admin.deleteUser(userId);

    if (error) {
      throw error;
    }
  }

  async resetPasswordForEmail(email: string, redirectTo: string) {
    const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    if (error) {
      throw error;
    }
  }

  async updateUserPassword(userId: string, newPassword: string) {
    const { error } = await this.supabase.auth.admin.updateUserById(userId, {
      password: newPassword,
    });

    if (error) {
      throw error;
    }
  }
}
