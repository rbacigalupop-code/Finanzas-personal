/**
 * SII activity categories and giro-specific expense acceptance rules.
 * Based on the clasificación de actividades económicas del SII (Chile)
 * and Art. 31 de la Ley de la Renta (LIR).
 */

export interface ActivityCategory {
  id: string;
  label: string;
  icon: string;
  desc: string;
}

export interface GiroExpenseRule {
  /** Expense category names that SII typically accepts without question for this giro */
  stronglyAccepted: string[];
  /** Expense categories that need documentation/justification for this giro */
  needsJustification: string[];
  /** Specific SII notes for this giro */
  siiNote: string;
  /** Typical accepted expenses (display list) */
  typicalExpenses: string[];
  /** Common risk areas to watch */
  risks: string[];
}

// ── Activity category list ────────────────────────────────────────────────────
export const ACTIVITY_CATEGORIES: ActivityCategory[] = [
  { id: 'tech',          label: 'Tecnología e Información',   icon: '💻', desc: 'Software, TI, desarrollo web, hosting' },
  { id: 'professional',  label: 'Servicios Profesionales',    icon: '💼', desc: 'Consultoría, asesoría, diseño, arquitectura' },
  { id: 'commerce',      label: 'Comercio',                   icon: '🛍️', desc: 'Retail, tiendas, e-commerce, importación' },
  { id: 'construction',  label: 'Construcción',               icon: '🏗️', desc: 'Obras, contratistas, arquitectura y diseño' },
  { id: 'food',          label: 'Gastronomía y Alimentos',    icon: '🍔', desc: 'Restaurant, catering, panadería, delivery' },
  { id: 'transport',     label: 'Transporte y Logística',     icon: '🚛', desc: 'Fletes, distribución, courier, taxi' },
  { id: 'health',        label: 'Salud y Bienestar',          icon: '🏥', desc: 'Clínicas, consultorios, dental, fitness' },
  { id: 'education',     label: 'Educación y Capacitación',   icon: '📚', desc: 'Academias, cursos, coaching, entrenamiento' },
  { id: 'manufacturing', label: 'Industria y Manufactura',    icon: '🏭', desc: 'Producción, fábrica, ensamble, taller' },
  { id: 'agriculture',   label: 'Agricultura y Pesca',        icon: '🌿', desc: 'Campo, ganadería, acuicultura, silvicultura' },
  { id: 'arts',          label: 'Arte y Entretenimiento',     icon: '🎨', desc: 'Eventos, música, producción, turismo' },
  { id: 'realestate',    label: 'Inmobiliario y Arriendos',   icon: '🏘️', desc: 'Corretaje, administración de propiedades' },
  { id: 'financial',     label: 'Servicios Financieros',      icon: '💰', desc: 'Créditos, seguros, factoring, inversiones' },
  { id: 'other',         label: 'Otro giro',                  icon: '📋', desc: 'Otro tipo de actividad económica' },
];

// ── Giro-specific expense rules ───────────────────────────────────────────────
export const GIRO_RULES: Record<string, GiroExpenseRule> = {
  tech: {
    stronglyAccepted: ['Software/Tech', 'Capacitación', 'Servicios básicos'],
    needsJustification: ['Transporte/Log.', 'Gastos varios'],
    siiNote:
      'Empresas de tecnología: SII acepta directamente licencias de software, hardware de trabajo, ' +
      'internet y hosting (Circular 27/2004). La capacitación técnica del equipo es deducible si ' +
      'está relacionada con el giro. Equipos deben ser de uso exclusivamente empresarial.',
    typicalExpenses: [
      'Licencias de software y SaaS',
      'Hardware (notebooks, servidores, equipos)',
      'Internet, hosting y cloud computing',
      'Capacitación técnica del equipo',
      'Arriendo de oficina o co-working',
      'Suscripciones a herramientas de desarrollo',
    ],
    risks: [
      'Software o dispositivos de uso personal del dueño',
      'Gastos de "entretenimiento tech" sin vinculación al giro',
    ],
  },

  professional: {
    stronglyAccepted: ['Software/Tech', 'Capacitación', 'Contab./Legal', 'Arriendo local'],
    needsJustification: ['Transporte/Log.', 'Marketing', 'Gastos varios'],
    siiNote:
      'Servicios profesionales: los gastos de oficina, software y capacitación son de fácil ' +
      'acreditación. Transporte a clientes es aceptado con respaldo (bitácora o registros). ' +
      'Gastos de representación aceptados hasta 1,5% de ingresos brutos (Circular SII 37/2009).',
    typicalExpenses: [
      'Arriendo de oficina o co-working',
      'Software profesional y herramientas',
      'Capacitación y certificaciones',
      'Libros y publicaciones técnicas',
      'Transporte a reuniones con clientes',
      'Seguro de responsabilidad civil profesional',
    ],
    risks: [
      'Almuerzos de negocios frecuentes sin documentación del cliente',
      'Vehículo sin acreditar uso exclusivo empresarial',
      'Gastos de representación sobre el 1,5% del ingreso bruto anual',
    ],
  },

  commerce: {
    stronglyAccepted: ['Inventario/Insumos', 'Transporte/Log.', 'Marketing', 'Arriendo local'],
    needsJustification: ['Software/Tech', 'Capacitación', 'Gastos varios'],
    siiNote:
      'Comercio: el costo de ventas (CMV) es el gasto central. SII puede solicitar libro de ' +
      'existencias o kardex para justificar inventario. Las mermas deben documentarse y ' +
      'comunicarse al SII (Circular 3/2012 para mermas de existencias).',
    typicalExpenses: [
      'Inventario y mercadería para venta',
      'Transporte y flete de mercadería',
      'Arriendo del local comercial',
      'Seguros de mercadería e inventario',
      'Marketing, publicidad y sitio web',
      'Equipos de punto de venta (POS)',
    ],
    risks: [
      'Mermas de inventario sin informe técnico o comunicación al SII',
      'Mercadería para uso personal del dueño registrada como gasto',
    ],
  },

  construction: {
    stronglyAccepted: ['Inventario/Insumos', 'Transporte/Log.', 'Arriendo local', 'Sueldos/Nómina'],
    needsJustification: ['Marketing', 'Capacitación', 'Gastos varios'],
    siiNote:
      'Construcción: SII exige trazabilidad de materiales y subcontratos. Cada gasto debe ' +
      'vincularse a una obra o proyecto específico. Los subcontratos deben tener factura válida. ' +
      'Arriendo de maquinaria con factura es plenamente deducible.',
    typicalExpenses: [
      'Materiales de construcción (con factura)',
      'Arriendo de maquinaria y equipos',
      'Subcontratos (con factura y retención si corresponde)',
      'EPP y equipos de seguridad laboral',
      'Transporte de materiales y trabajadores',
      'Honorarios de profesionales (arquitectos, ingenieros)',
    ],
    risks: [
      'Subcontratos informales o sin documentación',
      'Materiales sin vinculación clara a un proyecto',
      'Gastos de obra mezclados con gastos personales del dueño',
    ],
  },

  food: {
    stronglyAccepted: ['Inventario/Insumos', 'Sueldos/Nómina', 'Arriendo local', 'Servicios básicos'],
    needsJustification: ['Marketing', 'Capacitación', 'Gastos varios'],
    siiNote:
      'Gastronomía: SII distingue entre insumos para producción/venta (aceptados) y consumo ' +
      'personal del dueño (rechazado, art. 21 LIR). Es fundamental llevar un registro de ' +
      'ingredientes y su destino. Las patentes municipales y permisos sanitarios son deducibles.',
    typicalExpenses: [
      'Insumos y alimentos para producción o venta',
      'Equipos de cocina y maquinaria gastronómica',
      'Uniformes del personal',
      'Patentes municipales y permisos sanitarios (SEREMI)',
      'Combustible para delivery',
      'Marketing y redes sociales',
    ],
    risks: [
      'Consumo de alimentos e ingredientes por el dueño/familia',
      'Gastos de "entretención" con clientes en exceso del 1,5%',
      'Equipos domésticos usados como equipo de local',
    ],
  },

  transport: {
    stronglyAccepted: ['Inventario/Insumos', 'Sueldos/Nómina', 'Transporte/Log.', 'Servicios básicos'],
    needsJustification: ['Marketing', 'Capacitación', 'Gastos varios'],
    siiNote:
      'Transporte: vehículos de uso exclusivo empresarial son plenamente deducibles (combustible, ' +
      'mantención, seguros). Si hay uso mixto personal/empresarial, SII puede objetar. ' +
      'Se recomienda llevar bitácora de viajes (fecha, origen, destino, propósito).',
    typicalExpenses: [
      'Combustible para flota empresarial',
      'Mantención y reparación de vehículos',
      'Peajes, TAG y vías expresas',
      'Seguros de vehículos (uso comercial)',
      'GPS y tecnología de gestión de flota',
      'Neumáticos y repuestos',
    ],
    risks: [
      'Vehículos usados también para transporte personal/familiar',
      'Combustible sin bitácora de viajes que justifique el uso',
      'Seguros de vehículos contratados para uso personal',
    ],
  },

  health: {
    stronglyAccepted: ['Inventario/Insumos', 'Software/Tech', 'Capacitación', 'Sueldos/Nómina'],
    needsJustification: ['Transporte/Log.', 'Marketing', 'Gastos varios'],
    siiNote:
      'Salud: los equipos médicos, insumos clínicos y software de gestión de pacientes son ' +
      'deducibles. El seguro de responsabilidad civil profesional es aceptado. Cursos y ' +
      'actualizaciones deben ser del área de especialidad para ser deducibles.',
    typicalExpenses: [
      'Equipos médicos e instrumentos clínicos',
      'Insumos y consumibles de atención',
      'Software de gestión clínica o dental',
      'Seguro de responsabilidad civil médica',
      'Capacitación y perfeccionamiento profesional',
      'Arriendo de box o consulta',
    ],
    risks: [
      'Equipos de uso personal del profesional mezclados con clínica',
      'Gastos de bienestar personal (gym, nutricionista del dueño)',
      'Cursos sin relación directa con la especialidad clínica',
    ],
  },

  education: {
    stronglyAccepted: ['Inventario/Insumos', 'Software/Tech', 'Arriendo local', 'Capacitación'],
    needsJustification: ['Transporte/Log.', 'Marketing', 'Gastos varios'],
    siiNote:
      'Educación: el material didáctico, plataformas de aprendizaje y arriendos de sala son ' +
      'deducibles cuando están vinculados al servicio educativo prestado. La capacitación ' +
      'de los propios docentes es aceptada si está relacionada con las materias que enseñan.',
    typicalExpenses: [
      'Material didáctico y libros',
      'Plataformas e-learning y LMS',
      'Arriendo de sala o espacio de clases',
      'Equipos audiovisuales y proyectores',
      'Capacitación de docentes (área del giro)',
      'Software de gestión de alumnos',
    ],
    risks: [
      'Capacitación del dueño en áreas no relacionadas al giro declarado',
      'Material personal mezclado con material educativo',
    ],
  },

  manufacturing: {
    stronglyAccepted: ['Inventario/Insumos', 'Sueldos/Nómina', 'Servicios básicos', 'Transporte/Log.'],
    needsJustification: ['Marketing', 'Software/Tech', 'Capacitación', 'Gastos varios'],
    siiNote:
      'Manufactura: el costo de producción es el gasto central. SII acepta materias primas, ' +
      'maquinaria y consumo de energía productiva. Mantenga kardex de materias primas y ' +
      'registro de producción. Las mermas industriales deben tener informe técnico.',
    typicalExpenses: [
      'Materias primas e insumos de producción',
      'Maquinaria y equipos de planta',
      'Mantención preventiva de equipos',
      'Energía eléctrica y agua de proceso',
      'EPP y seguridad industrial',
      'Control de calidad e inspección',
    ],
    risks: [
      'Mermas sin informe técnico o sin comunicación al SII',
      'Uso de planta o maquinaria para proyectos personales del dueño',
      'Consumo de energía mezclado (casa + fábrica) sin medición separada',
    ],
  },

  agriculture: {
    stronglyAccepted: ['Inventario/Insumos', 'Transporte/Log.', 'Sueldos/Nómina', 'Servicios básicos'],
    needsJustification: ['Software/Tech', 'Marketing', 'Capacitación', 'Gastos varios'],
    siiNote:
      'Agricultura: verifica con tu contador si aplicas Renta Presunta (hasta 9.000 UF ventas ' +
      'anuales) o Renta Efectiva, ya que cambia completamente qué gastos deduces. En renta ' +
      'efectiva, semillas, fertilizantes, combustible de maquinaria y mano de obra son deducibles.',
    typicalExpenses: [
      'Semillas, abonos y agroquímicos',
      'Combustible de maquinaria agrícola',
      'Mantención de maquinaria y equipos',
      'Mano de obra temporal y de planta',
      'Agua para riego (derechos de agua)',
      'Fletes y transporte de producción',
    ],
    risks: [
      'Gastos del predio mezclados con gastos del hogar del propietario',
      'Agua o energía sin medición separada (predio vs. casa)',
      'Aplica renta presunta: en ese régimen no se deducen gastos reales',
    ],
  },

  arts: {
    stronglyAccepted: ['Inventario/Insumos', 'Marketing', 'Arriendo local'],
    needsJustification: ['Transporte/Log.', 'Capacitación', 'Gastos varios'],
    siiNote:
      'Arte y entretenimiento: SII acepta gastos directamente vinculados a la producción o ' +
      'presentación artística. Vestuario de escena es deducible (distinto del vestuario personal). ' +
      'Los derechos de autor y royalties pagados con factura son deducibles.',
    typicalExpenses: [
      'Equipos artísticos y técnicos (cámaras, instrumentos)',
      'Arriendo de espacio para eventos o ensayos',
      'Marketing, difusión y redes sociales',
      'Royalties y derechos de autor pagados',
      'Vestuario de escena o producción',
      'Transporte de equipos y producción',
    ],
    risks: [
      'Vestuario personal mezclado con vestuario de escena',
      'Gastos de entretenimiento personal del artista',
      'Equipos de uso personal del creador',
    ],
  },

  realestate: {
    stronglyAccepted: ['Arriendo local', 'Servicios básicos', 'Contab./Legal'],
    needsJustification: ['Inventario/Insumos', 'Transporte/Log.', 'Gastos varios'],
    siiNote:
      'Inmobiliario: distingue entre gastos de MANTENCIÓN (deducibles directo) y MEJORAS DE CAPITAL ' +
      '(se activan y deprecian, no se deducen inmediatamente). Esta diferencia es clave ante SII. ' +
      'Las comisiones de corretaje con factura y seguros de inmuebles son deducibles.',
    typicalExpenses: [
      'Mantención y reparación de propiedades',
      'Seguros de inmuebles arrendados',
      'Comisiones de corretaje (con factura)',
      'Gastos de administración y conserje',
      'Contribuciones de bienes raíces (en algunos casos)',
      'Honorarios contables y legales',
    ],
    risks: [
      'Mejoras de capital declaradas como mantención (SII las recalifica)',
      'Gastos del propietario que vive en el mismo inmueble que arrienda',
      'Bienes raíces no acogidos al régimen de renta presunta',
    ],
  },

  financial: {
    stronglyAccepted: ['Software/Tech', 'Contab./Legal', 'Capacitación'],
    needsJustification: ['Transporte/Log.', 'Marketing', 'Gastos varios'],
    siiNote:
      'Servicios financieros: cumplimiento regulatorio (CMF, UAF) y software especializado ' +
      'son deducibles. La capacitación en normativa financiera es aceptada. ' +
      'Gastos de representación deben estar dentro del 1,5% de ingresos brutos.',
    typicalExpenses: [
      'Software de gestión financiera y compliance',
      'Honorarios legales y auditoría',
      'Capacitación en normativa financiera',
      'Seguros de responsabilidad profesional',
      'Suscripciones a bases de datos financieras',
      'Arriendo de oficina',
    ],
    risks: [
      'Intereses de deudas financieras propias del dueño',
      'Gastos de representación excesivos',
    ],
  },

  other: {
    stronglyAccepted: [],
    needsJustification: ['Transporte/Log.', 'Marketing', 'Gastos varios'],
    siiNote:
      'Para cualquier giro, el principio del Art. 31 LIR es que el gasto sea NECESARIO para ' +
      'producir la renta del giro declarado. Documente siempre la relación directa entre ' +
      'el gasto y su actividad económica. Sin giro específico, cualquier gasto puede ser objetado.',
    typicalExpenses: [
      'Gastos directamente relacionados con el giro declarado',
      'Insumos y materiales para el servicio o producto',
      'Remuneraciones del personal operativo',
      'Arriendo de espacios de trabajo',
    ],
    risks: [
      'Gastos que no tienen relación directa con el giro declarado ante el SII',
      'Uso mixto personal/empresarial sin documentación del porcentaje',
    ],
  },
};

/** Returns the GiroRule for a given category ID, falling back to 'other' */
export function getGiroRule(activityCategory?: string | null): GiroExpenseRule {
  return GIRO_RULES[activityCategory || 'other'] ?? GIRO_RULES['other'];
}

/** Returns the ActivityCategory object for a given ID */
export function getActivityCategory(id?: string | null): ActivityCategory | undefined {
  return ACTIVITY_CATEGORIES.find((c) => c.id === id);
}
