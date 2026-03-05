
export type MaterialItemType = {
    id: string;
    label: string;
};

export type MaterialSubCategory = {
    id: string;
    label: string;
    items: MaterialItemType[];
};

export type MaterialCategory = {
    id: string;
    label: string;
    subCategories: MaterialSubCategory[];
};

export const MATERIAL_CATEGORIES: MaterialCategory[] = [
    {
        id: "01",
        label: "01 - EPP / SEGURIDAD PERSONAL",
        subCategories: [
            {
                id: "01.1",
                label: "01.1 Protección Corporal",
                items: [
                    { id: "01.1.1", label: "01.1.1 Trajes de intervención (estructural / forestal / HazMat)" },
                    { id: "01.1.2", label: "01.1.2 Chaquetas y pantalones de aproximación" },
                    { id: "01.1.3", label: "01.1.3 Ropa de entrenamiento / instrucción" }
                ]
            },
            {
                id: "01.2",
                label: "01.2 Protección de Cabeza y Ojos",
                items: [
                    { id: "01.2.1", label: "01.2.1 Cascos estructurales / forestales / rescate" },
                    { id: "01.2.2", label: "01.2.2 Pantallas faciales y antiparras" },
                    { id: "01.2.3", label: "01.2.3 Capuchas ignífugas (nomex)" }
                ]
            },
            {
                id: "01.3",
                label: "01.3 Protección de Manos y Pies",
                items: [
                    { id: "01.3.1", label: "01.3.1 Guantes de intervención / rescate / médicos" },
                    { id: "01.3.2", label: "01.3.2 Botas de bombero (caña alta / dieléctricas / forestales)" },
                    { id: "01.3.3", label: "01.3.3 Calzado de cuartel / instrucción" }
                ]
            },
            {
                id: "01.4",
                label: "01.4 Protección Auditiva y Respiratoria (básica)",
                items: [
                    { id: "01.4.1", label: "01.4.1 Tapones / orejeras para ruido" },
                    { id: "01.4.2", label: "01.4.2 Mascarillas de filtro mecánico (no ERA)" }
                ]
            }
        ]
    },
    {
        id: "02",
        label: "02 - EXTINCIÓN DE INCENDIOS",
        subCategories: [
            {
                id: "02.1",
                label: "02.1 Lanzas y Boquillas",
                items: [
                    { id: "02.1.1", label: "02.1.1 Lanzas manuales combinadas (chorro/niebla)" },
                    { id: "02.1.2", label: "02.1.2 Monitores fijos y portátiles" },
                    { id: "02.1.3", label: "02.1.3 Boquillas especiales (espuma, neblina fina, forestal)" },
                    { id: "02.1.4", label: "02.1.4 Adaptadores y difusores" }
                ]
            },
            {
                id: "02.2",
                label: "02.2 Mangueras y Accesorios de Conducción",
                items: [
                    { id: "02.2.1", label: "02.2.1 Mangueras de ataque (38 / 45 mm)" },
                    { id: "02.2.2", label: "02.2.2 Mangueras de gran caudal (70 / 100 mm)" },
                    { id: "02.2.3", label: "02.2.3 Acoples Storz / Rosca / Instantáneos" },
                    { id: "02.2.4", label: "02.2.4 Bifurcaciones, reducciones y colectores" },
                    { id: "02.2.5", label: "02.2.5 Llaves de paso, válvulas y retenedores" }
                ]
            },
            {
                id: "02.3",
                label: "02.3 Sistemas de Espuma y Agentes Especiales",
                items: [
                    { id: "02.3.1", label: "02.3.1 Proporcionadores / educadores de espuma" },
                    { id: "02.3.2", label: "02.3.2 Baldes, tanques y mochilas de mezcla" },
                    { id: "02.3.3", label: "02.3.3 Agentes espumógenos (AFFF, Clase A, CAFS)" },
                    { id: "02.3.4", label: "02.3.4 Extintores portátiles (ABC, CO₂, agua)" }
                ]
            },
            {
                id: "02.4",
                label: "02.4 Hidrantes y Toma de Agua",
                items: [
                    { id: "02.4.1", label: "02.4.1 Llaves de hidrante / columnas" },
                    { id: "02.4.2", label: "02.4.2 Adaptadores de toma (piscina, pileta, cisterna)" },
                    { id: "02.4.3", label: "02.4.3 Filtros y válvulas de pie" }
                ]
            }
        ]
    },
    {
        id: "03",
        label: "03 - RESCATE Y EXTRICACIÓN VEHICULAR",
        subCategories: [
            {
                id: "03.1",
                label: "03.1 Herramientas Hidráulicas",
                items: [
                    { id: "03.1.1", label: "03.1.1 Cortadoras hidráulicas" },
                    { id: "03.1.2", label: "03.1.2 Expansores / rescatadores combinados" },
                    { id: "03.1.3", label: "03.1.3 Cilindros de empuje / separación" },
                    { id: "03.1.4", label: "03.1.4 Bombas hidráulicas (eléctricas / combustible / manuales)" },
                    { id: "03.1.5", label: "03.1.5 Mangueras, acoples rápidos y kits de reparación" }
                ]
            },
            {
                id: "03.2",
                label: "03.2 Herramientas Neumáticas",
                items: [
                    { id: "03.2.1", label: "03.2.1 Almohadillas de elevación (baja / media / alta presión)" },
                    { id: "03.2.2", label: "03.2.2 Controladores, reguladores y manómetros" },
                    { id: "03.2.3", label: "03.2.3 Mangueras de aire y acoples rápidos" }
                ]
            },
            {
                id: "03.3",
                label: "03.3 Estabilización y Apoyo Vehicular",
                items: [
                    { id: "03.3.1", label: "03.3.1 Calzos de rueda y bloques de madera" },
                    { id: "03.3.2", label: "03.3.2 Puntales telescópicos y sistemas de apuntalamiento" },
                    { id: "03.3.3", label: "03.3.3 Cintas de anclaje y trinquete" }
                ]
            }
        ]
    },
    {
        id: "04",
        label: "04 - RESCATE EN ALTURA Y CUERDAS",
        subCategories: [
            {
                id: "04.1",
                label: "04.1 Cuerdas, Cintas y Accesorios Flexibles",
                items: [
                    { id: "04.1.1", label: "04.1.1 Cuerdas estáticas de trabajo (EN 1891)" },
                    { id: "04.1.2", label: "04.1.2 Cuerdas dinámicas de vida (EN 892)" },
                    { id: "04.1.3", label: "04.1.3 Cintas tubulares / planas y sling de anclaje" },
                    { id: "04.1.4", label: "04.1.4 Cordines auxiliares y prusiks" }
                ]
            },
            {
                id: "04.2",
                label: "04.2 Hardware de Aseguramiento y Progresión",
                items: [
                    { id: "04.2.1", label: "04.2.1 Mosquetones (seguro manual / automático / triple acción)" },
                    { id: "04.2.2", label: "04.2.2 Descensores (ocho, placas, ID, racks)" },
                    { id: "04.2.3", label: "04.2.3 Bloqueadores mecánicos y de cuerda" },
                    { id: "04.2.4", label: "04.2.4 Poleas simples, dobles y polipastos de rescate" }
                ]
            },
            {
                id: "04.3",
                label: "04.3 Arneses y Equipos de Sujeción Personal",
                items: [
                    { id: "04.3.1", label: "04.3.1 Arneses de asiento / pecho / cuerpo completo" },
                    { id: "04.3.2", label: "04.3.2 Cascos de altura con barbiquejo y portelinternas" },
                    { id: "04.3.3", label: "04.3.3 Dispositivos anticaída y retenedores" }
                ]
            },
            {
                id: "04.4",
                label: "04.4 Sistemas de Izaje y Evacuación",
                items: [
                    { id: "04.4.1", label: "04.4.1 Trípodes y anclajes portátiles" },
                    { id: "04.4.2", label: "04.4.2 Camillas de rescate vertical (Sked, Robertson)" },
                    { id: "04.4.3", label: "04.4.3 Kits de evacuación tipo \"descensor controlado\"" }
                ]
            }
        ]
    },
    {
        id: "05",
        label: "05 - ATENCIÓN PREHOSPITALARIA (MÉDICO)",
        subCategories: [
            {
                id: "05.1",
                label: "05.1 Inmovilización y Traslado",
                items: [
                    { id: "05.1.1", label: "05.1.1 Tablas rígidas / espinales / tablas cortas" },
                    { id: "05.1.2", label: "05.1.2 Collares cervicales (ajustables / pediátricos)" },
                    { id: "05.1.3", label: "05.1.3 Férulas neumáticas / de vacío / moldeables" },
                    { id: "05.1.4", label: "05.1.4 Camillas plegables, de cuchara y de lona" }
                ]
            },
            {
                id: "05.2",
                label: "05.2 Ventilación y Oxigenoterapia",
                items: [
                    { id: "05.2.1", label: "05.2.1 Balones de oxígeno portátiles y fijos" },
                    { id: "05.2.2", label: "05.2.2 Reguladores, mascarillas y cánulas" },
                    { id: "05.2.3", label: "05.2.3 Reanimadores manuales (AMBU) adultos/pediátricos" },
                    { id: "05.2.4", label: "05.2.4 Aspiradores de secreciones portátiles" }
                ]
            },
            {
                id: "05.3",
                label: "05.3 Control de Hemorragias y Heridas",
                items: [
                    { id: "05.3.1", label: "05.3.1 Torniquetes comerciales y vendajes hemostáticos" },
                    { id: "05.3.2", label: "05.3.2 Vendajes, gasas, apósitos y cintas adhesivas" },
                    { id: "05.3.3", label: "05.3.3 Tijeras de trauma y kits de sutura básica" }
                ]
            },
            {
                id: "05.4",
                label: "05.4 Monitoreo y Soporte Vital",
                items: [
                    { id: "05.4.1", label: "05.4.1 Tensiómetros, estetoscopios y termómetros" },
                    { id: "05.4.2", label: "05.4.2 Pulsioxímetros y glucómetros" },
                    { id: "05.4.3", label: "05.4.3 DEA / DESA con accesorios y repuestos" }
                ]
            }
        ]
    },
    {
        id: "06",
        label: "06 - ILUMINACIÓN Y ENERGÍA",
        subCategories: [
            {
                id: "06.1",
                label: "06.1 Iluminación Personal y de Escena",
                items: [
                    { id: "06.1.1", label: "06.1.1 Linternas frontales y de mano (LED)" },
                    { id: "06.1.2", label: "06.1.2 Focos portátiles de escena / trípode" },
                    { id: "06.1.3", label: "06.1.3 Balizas y luces estroboscópicas" }
                ]
            },
            {
                id: "06.2",
                label: "06.2 Torres y Sistemas de Iluminación Fija",
                items: [
                    { id: "06.2.1", label: "06.2.1 Torres telescópicas con mástil" },
                    { id: "06.2.2", label: "06.2.2 Grupos de luces LED montadas en vehículo" },
                    { id: "06.2.3", label: "06.2.3 Reflectores de gran alcance" }
                ]
            },
            {
                id: "06.3",
                label: "06.3 Generación de Energía",
                items: [
                    { id: "06.3.1", label: "06.3.1 Grupos electrógenos portátiles (gasolina/diésel)" },
                    { id: "06.3.2", label: "06.3.2 Generadores inverters (silenciosos / electrónicos)" },
                    { id: "06.3.3", label: "06.3.3 Power stations / baterías estacionarias" }
                ]
            },
            {
                id: "06.4",
                label: "06.4 Distribución y Accesorios Eléctricos",
                items: [
                    { id: "06.4.1", label: "06.4.1 Cables de extensión industriales (IP44/IP67)" },
                    { id: "06.4.2", label: "06.4.2 Bobinas porta-cables con protección térmica" },
                    { id: "06.4.3", label: "06.4.3 Adaptadores, transformadores y protecciones" }
                ]
            }
        ]
    },
    {
        id: "07",
        label: "07 - HERRAMIENTAS MANUALES Y MECÁNICAS",
        subCategories: [
            {
                id: "07.1",
                label: "07.1 Corte, Percusión y Acceso Forzado",
                items: [
                    { id: "07.1.1", label: "07.1.1 Hachas de bombero (filo/contragolpe)" },
                    { id: "07.1.2", label: "07.1.2 Machetes, hachuelas y podones" },
                    { id: "07.1.3", label: "07.1.3 Picas, palancas y barras de uña (Halligan, etc)" },
                    { id: "07.1.4", label: "07.1.4 Mazos, martillos y porras de rescate" },
                    { id: "07.1.5", label: "07.1.5 Cuñas, calzos y herramientas de estabilización manual" },
                    { id: "07.1.6", label: "07.1.6 Herramientas de cerrajería básica" }
                ]
            },
            {
                id: "07.2",
                label: "07.2 Sujeción, Ajuste y Desmontaje",
                items: [
                    { id: "07.2.1", label: "07.2.1 Llaves combinadas, fijas y ajustables" },
                    { id: "07.2.2", label: "07.2.2 Pinzas, alicates, tenazas y cortadores de cable" },
                    { id: "07.2.3", label: "07.2.3 Destornilladores, dados y juegos de vasos" },
                    { id: "07.2.4", label: "07.2.4 Llaves Stillson, de tubo y especiales" }
                ]
            },
            {
                id: "07.3",
                label: "07.3 Palanca, Izaje y Tracción Manual",
                items: [
                    { id: "07.3.1", label: "07.3.1 Gatos mecánicos, hidráulicos manuales y tijera" },
                    { id: "07.3.2", label: "07.3.2 Cables de acero, eslingas y grilletes" },
                    { id: "07.3.3", label: "07.3.3 Poleas simples, dobles y polipastos manuales" },
                    { id: "07.3.4", label: "07.3.4 Winches manuales y tirfor" }
                ]
            },
            {
                id: "07.4",
                label: "07.4 Medición, Nivelación y Trazado",
                items: [
                    { id: "07.4.1", label: "07.4.1 Cintas métricas, láser y niveles" },
                    { id: "07.4.2", label: "07.4.2 Marcadores, tizas y punzones" },
                    { id: "07.4.3", label: "07.4.3 Detectores de metales / tensión / gas" }
                ]
            }
        ]
    },
    {
        id: "08",
        label: "08 - EQUIPOS MOTORIZADOS PORTÁTILES",
        subCategories: [
            {
                id: "08.1",
                label: "08.1 Corte Motorizado",
                items: [
                    { id: "08.1.1", label: "08.1.1 Motosierras para madera (gasolina/eléctricas)" },
                    { id: "08.1.2", label: "08.1.2 Radiales / moladoras para metal y concreto" },
                    { id: "08.1.3", label: "08.1.3 Sierras sable / recíprocas de rescate" },
                    { id: "08.1.4", label: "08.1.4 Discos, cadenas, guías y accesorios de corte" }
                ]
            },
            {
                id: "08.2",
                label: "08.2 Ventilación y Extracción",
                items: [
                    { id: "08.2.1", label: "08.2.1 Ventiladores de ataque (PPA/PPV)" },
                    { id: "08.2.2", label: "08.2.2 Ventiladores eléctricos portátiles" },
                    { id: "08.2.3", label: "08.2.3 Extractores de humo y equipos de presurización" }
                ]
            },
            {
                id: "08.3",
                label: "08.3 Bombeo y Succión Portátil",
                items: [
                    { id: "08.3.1", label: "08.3.1 Motobombas portátiles (agua limpia / sucia)" },
                    { id: "08.3.2", label: "08.3.2 Bombas de achique y trasvase" },
                    { id: "08.3.3", label: "08.3.3 Equipos de succión para líquidos peligrosos" }
                ]
            },
            {
                id: "08.4",
                label: "08.4 Otros Equipos Motorizados",
                items: [
                    { id: "08.4.1", label: "08.4.1 Compresores de aire portátiles" },
                    { id: "08.4.2", label: "08.4.2 Hidrolavadoras de alta presión" },
                    { id: "08.4.3", label: "08.4.3 Herramientas multifunción (oscilantes, etc.)" }
                ]
            }
        ]
    },
    {
        id: "09",
        label: "09 - COMUNICACIONES Y TECNOLOGÍA",
        subCategories: [
            {
                id: "09.1",
                label: "09.1 Radiocomunicaciones",
                items: [
                    { id: "09.1.1", label: "09.1.1 Radios portátiles VHF/UHF / TETRA" },
                    { id: "09.1.2", label: "09.1.2 Radios móviles y bases de cuartel" },
                    { id: "09.1.3", label: "09.1.3 Repetidores, antenas y amplificadores" },
                    { id: "09.1.4", label: "09.1.4 Accesorios: auriculares, PTT, micrófonos" }
                ]
            },
            {
                id: "09.2",
                label: "09.2 Señalización y Alerta",
                items: [
                    { id: "09.2.1", label: "09.2.1 Megáfonos y sirenas portátiles" },
                    { id: "09.2.2", label: "09.2.2 Balizas sonoras y visuales" },
                    { id: "09.2.3", label: "09.2.3 Sistemas de alerta masiva / notificación" }
                ]
            },
            {
                id: "09.3",
                label: "09.3 Tecnología de Apoyo Operativo",
                items: [
                    { id: "09.3.1", label: "09.3.1 Tablets / laptops ruggedizadas para escena" },
                    { id: "09.3.2", label: "09.3.2 Cámaras térmicas y drones de reconocimiento" },
                    { id: "09.3.3", label: "09.3.3 Software de gestión de incidentes y mapas" }
                ]
            }
        ]
    },
    {
        id: "10",
        label: "10 - LOGÍSTICA Y APOYO OPERATIVO",
        subCategories: [
            {
                id: "10.1",
                label: "10.1 Señalización y Control de Escena",
                items: [
                    { id: "10.1.1", label: "10.1.1 Conos, vallas y cintas de delimitación" },
                    { id: "10.1.2", label: "10.1.2 Señales reflectivas y paneles informativos" },
                    { id: "10.1.3", label: "10.1.3 Chalecos de identificación por función" }
                ]
            },
            {
                id: "10.2",
                label: "10.2 Contención y Limpieza",
                items: [
                    { id: "10.2.1", label: "10.2.1 Kits para derrames (absorbentes, contenedores)" },
                    { id: "10.2.2", label: "10.2.2 Palas, escobas y equipos de barrido" },
                    { id: "10.2.3", label: "10.2.3 Bolsas de residuos peligrosos y contenedores" }
                ]
            },
            {
                id: "10.3",
                label: "10.3 Campamento y Soporte en Terreno",
                items: [
                    { id: "10.3.1", label: "10.3.1 Carpas, refugios y mobiliario plegable" },
                    { id: "10.3.2", label: "10.3.2 Cocinas de campaña y sistemas de agua potable" },
                    { id: "10.3.3", label: "10.3.3 Equipos de frío (hieleras, refrigeradores portátiles)" }
                ]
            },
            {
                id: "10.4",
                label: "10.4 Almacenamiento y Transporte",
                items: [
                    { id: "10.4.1", label: "10.4.1 Cajas, baúles y contenedores estancos" },
                    { id: "10.4.2", label: "10.4.2 Mochilas, bolsas de equipo y fundas" },
                    { id: "10.4.3", label: "10.4.3 Carros, diablitos y sistemas de carga" }
                ]
            }
        ]
    }
];
