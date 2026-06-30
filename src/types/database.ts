export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          nombre: string;
          created_at: string | null;
        };
        Insert: {
          id: string;
          nombre: string;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          nombre?: string;
          created_at?: string | null;
        };
        Relationships: [];
      };
      eventos: {
        Row: {
          id: string;
          nombre: string;
          fecha: string | null;
          lugar: string | null;
          cliente: string | null;
          presupuesto: number;
          con_factura: boolean;
          retencion_irpf: number;
          estado: 'pendiente' | 'confirmado' | 'completado' | 'cancelado';
          observaciones: string | null;
          created_by: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          nombre: string;
          fecha?: string | null;
          lugar?: string | null;
          cliente?: string | null;
          presupuesto?: number;
          con_factura?: boolean;
          retencion_irpf?: number;
          estado?: 'pendiente' | 'confirmado' | 'completado' | 'cancelado';
          observaciones?: string | null;
          created_by?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          nombre?: string;
          fecha?: string | null;
          lugar?: string | null;
          cliente?: string | null;
          presupuesto?: number;
          con_factura?: boolean;
          retencion_irpf?: number;
          estado?: 'pendiente' | 'confirmado' | 'completado' | 'cancelado';
          observaciones?: string | null;
          created_by?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      ingresos: {
        Row: {
          id: string;
          concepto: string;
          cantidad: number;
          fecha: string;
          evento_id: string | null;
          created_by: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          concepto: string;
          cantidad: number;
          fecha: string;
          evento_id?: string | null;
          created_by?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          concepto?: string;
          cantidad?: number;
          fecha?: string;
          evento_id?: string | null;
          created_by?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      gastos: {
        Row: {
          id: string;
          concepto: string;
          cantidad: number;
          categoria: string;
          fecha: string;
          evento_id: string | null;
          pagado_por: string | null;
          reembolsado: boolean;
          created_by: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          concepto: string;
          cantidad: number;
          categoria: string;
          fecha: string;
          evento_id?: string | null;
          pagado_por?: string | null;
          reembolsado?: boolean;
          created_by?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          concepto?: string;
          cantidad?: number;
          categoria?: string;
          fecha?: string;
          evento_id?: string | null;
          pagado_por?: string | null;
          reembolsado?: boolean;
          created_by?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      pagos_evento: {
        Row: {
          id: string;
          evento_id: string;
          fecha: string;
          cantidad: number;
          concepto: string | null;
          created_by: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          evento_id: string;
          fecha: string;
          cantidad: number;
          concepto?: string | null;
          created_by?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          evento_id?: string;
          fecha?: string;
          cantidad?: number;
          concepto?: string | null;
          created_by?: string | null;
          created_at?: string | null;
        };
        Relationships: [];
      };
      repartos_evento: {
        Row: {
          id: string;
          evento_id: string;
          socio_id: string | null;
          cantidad: number;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          evento_id: string;
          socio_id?: string | null;
          cantidad: number;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          evento_id?: string;
          socio_id?: string | null;
          cantidad?: number;
          created_at?: string | null;
        };
        Relationships: [];
      };
      fondo_movimientos: {
        Row: {
          id: string;
          fecha: string;
          concepto: string;
          cantidad: number;
          evento_id: string | null;
          gasto_id: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          fecha?: string;
          concepto: string;
          cantidad: number;
          evento_id?: string | null;
          gasto_id?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          fecha?: string;
          concepto?: string;
          cantidad?: number;
          evento_id?: string | null;
          gasto_id?: string | null;
          created_at?: string | null;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      reembolsar_gasto: {
        Args: { p_gasto_id: string; p_fecha?: string };
        Returns: void;
      };
      crear_reparto_evento: {
        Args: { p_evento_id: string; p_repartos: Json };
        Returns: void;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
