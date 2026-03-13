
export type InventoryItemType = {
    id: string;
    label: string;
};

export type InventorySubCategory = {
    id: string;
    label: string;
    items: InventoryItemType[];
};

export type InventoryCategory = {
    id: string;
    label: string;
    subCategories: InventorySubCategory[];
};

export const INVENTORY_CATEGORIES: InventoryCategory[] = [
    {
        id: "01",
        label: "01 - MOBILIARIO Y EQUIPAMIENTO",
        subCategories: [
            {
                id: "01.1",
                label: "01.1 Asientos",
                items: [
                    { id: "01.1.1", label: "01.1.1 Sillas de oficina" },
                    { id: "01.1.2", label: "01.1.2 Banquetas" },
                    { id: "01.1.3", label: "01.1.3 Sillones / Sofás" }
                ]
            },
            {
                id: "01.2",
                label: "01.2 Mesas y Planos de Trabajo",
                items: [
                    { id: "01.2.1", label: "01.2.1 Escritorios" },
                    { id: "01.2.2", label: "01.2.2 Mesas de comedor" },
                    { id: "01.2.3", label: "01.2.3 Mesas de reunión" },
                    { id: "01.2.4", label: "01.2.4 Mesas de luz" }
                ]
            },
            {
                id: "01.3",
                label: "01.3 Almacenamiento",
                items: [
                    { id: "01.3.1", label: "01.3.1 Placares / Armarios" },
                    { id: "01.3.2", label: "01.3.2 Archivadores" },
                    { id: "01.3.3", label: "01.3.3 Estanterías" },
                    { id: "01.3.4", label: "01.3.4 Lockers" }
                ]
            },
            {
                id: "01.4",
                label: "01.4 Descanso",
                items: [
                    { id: "01.4.1", label: "01.4.1 Camas / Marcos" },
                    { id: "01.4.2", label: "01.4.2 Colchones" },
                    { id: "01.4.3", label: "01.4.3 Almohadas" }
                ]
            }
        ]
    },
    {
        id: "02",
        label: "02 - TECNOLOGÍA (IT)",
        subCategories: [
            {
                id: "02.1",
                label: "02.1 Computación",
                items: [
                    { id: "02.1.1", label: "02.1.1 CPUs / Servidores" },
                    { id: "02.1.2", label: "02.1.2 Notebooks / Laptops" },
                    { id: "02.1.3", label: "02.1.3 Tablets" }
                ]
            },
            {
                id: "02.2",
                label: "02.2 Visualización",
                items: [
                    { id: "02.2.1", label: "02.2.1 Monitores" },
                    { id: "02.2.2", label: "02.2.2 Televisores" },
                    { id: "02.2.3", label: "02.2.3 Proyectores" }
                ]
            },
            {
                id: "02.3",
                label: "02.3 Periféricos y Accesorios",
                items: [
                    { id: "02.3.1", label: "02.3.1 Teclados y Mouse" },
                    { id: "02.3.2", label: "02.3.2 UPS / Estabilizadores" },
                    { id: "02.3.3", label: "02.3.3 Parlantes / Audio" }
                ]
            },
            {
                id: "02.4",
                label: "02.4 Impresión",
                items: [
                    { id: "02.4.1", label: "02.4.1 Impresoras / Multifunción" },
                    { id: "02.4.2", label: "02.4.2 Escáneres" }
                ]
            }
        ]
    },
    {
        id: "03",
        label: "03 - ELECTRODOMÉSTICOS",
        subCategories: [
            {
                id: "03.1",
                label: "03.1 Línea Blanca",
                items: [
                    { id: "03.1.1", label: "03.1.1 Heladeras / Freezers" },
                    { id: "03.1.2", label: "03.1.2 Cocinas / Hornos" },
                    { id: "03.1.3", label: "03.1.3 Lavarropas" }
                ]
            },
            {
                id: "03.2",
                label: "03.2 Climatización",
                items: [
                    { id: "03.2.1", label: "03.2.1 Aires Acondicionados" },
                    { id: "03.2.2", label: "03.2.2 Estufas / Calefactores" },
                    { id: "03.2.3", label: "03.2.3 Ventiladores" }
                ]
            },
            {
                id: "03.3",
                label: "03.3 Pequeños Electrodomésticos",
                items: [
                    { id: "03.3.1", label: "03.3.1 Pavas eléctricas" },
                    { id: "03.3.2", label: "03.3.2 Cafeteras" },
                    { id: "03.3.3", label: "03.3.3 Microondas" },
                    { id: "03.3.4", label: "03.3.4 Tostadoras" }
                ]
            }
        ]
    },
    {
        id: "04",
        label: "04 - BAZAR Y COCINA",
        subCategories: [
            {
                id: "04.1",
                label: "04.1 Vajilla",
                items: [
                    { id: "04.1.1", label: "04.1.1 Platos" },
                    { id: "04.1.2", label: "04.1.2 Vasos / Copas" },
                    { id: "04.1.3", label: "04.1.3 Tazas" }
                ]
            },
            {
                id: "04.2",
                label: "04.2 Cubertería",
                items: [
                    { id: "04.2.1", label: "04.2.1 Tenedores" },
                    { id: "04.2.2", label: "04.2.2 Cucharas" },
                    { id: "04.2.3", label: "04.2.3 Cuchillos" },
                    { id: "04.2.4", label: "04.2.4 Utensilios de servir" }
                ]
            },
            {
                id: "04.3",
                label: "04.3 Batería de Cocina",
                items: [
                    { id: "04.3.1", label: "04.3.1 Ollas" },
                    { id: "04.3.2", label: "04.3.2 Sartenes / Woks" },
                    { id: "04.3.3", label: "04.3.3 Pavas de hornalla" },
                    { id: "04.3.4", label: "04.3.4 Fuentes / Bandejas" }
                ]
            }
        ]
    },
    {
        id: "05",
        label: "05 - OTROS BIENES",
        subCategories: [
            {
                id: "05.1",
                label: "05.1 Limpieza",
                items: [
                    { id: "05.1.1", label: "05.1.1 Aspiradoras" },
                    { id: "05.1.2", label: "05.1.2 Lustradoras" },
                    { id: "05.1.3", label: "05.1.3 Escaleras de mano" }
                ]
            },
            {
                id: "05.2",
                label: "05.2 Decoración y Varios",
                items: [
                    { id: "05.2.1", label: "05.2.1 Cuadros" },
                    { id: "05.2.2", label: "05.2.2 Relojes de pared" },
                    { id: "05.2.3", label: "05.2.3 Pizarrones" }
                ]
            }
        ]
    }
];
