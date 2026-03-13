
export type ClothingItemType = {
    id: string;
    label: string;
};

export type ClothingSubCategory = {
    id: string;
    label: string;
    items: ClothingItemType[];
};

export type ClothingCategory = {
    id: string;
    label: string;
    subCategories: ClothingSubCategory[];
};

export const CLOTHING_CATEGORIES: ClothingCategory[] = [
    {
        id: "01",
        label: "01 - EPP / SERVICIOS (PROTECCIÓN)",
        subCategories: [
            {
                id: "01.1",
                label: "01.1 Estructural (Incendio)",
                items: [
                    { id: "01.1.1", label: "01.1.1 Cascos Estructurales" },
                    { id: "01.1.2", label: "01.1.2 Botas de Incendio (Goma/Cuero)" },
                    { id: "01.1.3", label: "01.1.3 Equipos de Protección (Chaquetón/Pantalón)" },
                    { id: "01.1.4", label: "01.1.4 Accesorios (Guantes/Esclavinas)" }
                ]
            },
            {
                id: "01.2",
                label: "01.2 Multirol (Forestal / Rescate)",
                items: [
                    { id: "01.2.1", label: "01.2.1 Cascos Multirol / Forestales" },
                    { id: "01.2.2", label: "01.2.2 Antiparras y Protección Ocular" },
                    { id: "01.2.3", label: "01.2.3 Chaquetas Forestal / Rescate" },
                    { id: "01.2.4", label: "01.2.4 Pantalones Forestal / Rescate" },
                    { id: "01.2.5", label: "01.2.5 Guantes de Rescate / Forestal" },
                    { id: "01.2.6", label: "01.2.6 Calzado Forestal Específico" }
                ]
            }
        ]
    },
    {
        id: "02",
        label: "02 - FAJINA (UNIFORME DE DIARIO)",
        subCategories: [
            {
                id: "02.1",
                label: "02.1 Prendas de Fajina",
                items: [
                    { id: "02.1.1", label: "02.1.1 Pantalones de fajina" },
                    { id: "02.1.2", label: "02.1.2 Remeras" },
                    { id: "02.1.3", label: "02.1.3 Tricotas" },
                    { id: "02.1.4", label: "02.1.4 Camperas / Abrigo" }
                ]
            },
            {
                id: "02.2",
                label: "02.2 Calzado y Accesorios",
                items: [
                    { id: "02.2.1", label: "02.2.1 Borceguíes" },
                    { id: "02.2.2", label: "02.2.2 Cintos / Cinturones" }
                ]
            }
        ]
    },
    {
        id: "03",
        label: "03 - GALA Y MEDIA GALA",
        subCategories: [
            {
                id: "03.1",
                label: "03.1 Indumentaria de Gala",
                items: [
                    { id: "03.1.1", label: "03.1.1 Gorros / Quepis" },
                    { id: "03.1.2", label: "03.1.2 Camisas" },
                    { id: "03.1.3", label: "03.1.3 Pantalones de vestir" },
                    { id: "03.1.4", label: "03.1.4 Corbatas" }
                ]
            }
        ]
    }
];
