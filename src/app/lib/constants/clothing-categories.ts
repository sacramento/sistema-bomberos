
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
        label: "01 - EPP / SERVICIO (PROTECCIÓN)",
        subCategories: [
            {
                id: "01.1",
                label: "01.1 Estructural (Incendio)",
                items: [
                    { id: "01.1.1", label: "01.1.1 Casco Estructural" },
                    { id: "01.1.2", label: "01.1.2 Bota de Incendio" },
                    { id: "01.1.3", label: "01.1.3 Chaquetón Estructural" },
                    { id: "01.1.4", label: "01.1.4 Pantalón Estructural" },
                    { id: "01.1.5", label: "01.1.5 Guante Estructural" },
                    { id: "01.1.6", label: "01.1.6 Esclavina (Nomex)" }
                ]
            },
            {
                id: "01.2",
                label: "01.2 Forestal",
                items: [
                    { id: "01.2.1", label: "01.2.1 Casco Forestal" },
                    { id: "01.2.2", label: "01.2.2 Chaqueta Forestal" },
                    { id: "01.2.3", label: "01.2.3 Pantalón Forestal" },
                    { id: "01.2.4", label: "01.2.4 Guante Forestal" },
                    { id: "01.2.5", label: "01.2.5 Calzado Forestal" },
                    { id: "01.2.6", label: "01.2.6 Antiparra / Protección Ocular" }
                ]
            },
            {
                id: "01.3",
                label: "01.3 Rescate",
                items: [
                    { id: "01.3.1", label: "01.3.1 Casco de Rescate" },
                    { id: "01.3.2", label: "01.3.2 Chaqueta de Rescate" },
                    { id: "01.3.3", label: "01.3.3 Pantalón de Rescate" },
                    { id: "01.3.4", label: "01.3.4 Guante de Rescate" },
                    { id: "01.3.5", label: "01.3.5 Calzado de Rescate" }
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
                label: "02.1 Prenda de Fajina",
                items: [
                    { id: "02.1.1", label: "02.1.1 Pantalón de fajina" },
                    { id: "02.1.2", label: "02.1.2 Remera (Manga corta/larga)" },
                    { id: "02.1.3", label: "02.1.3 Camisa de fajina" },
                    { id: "02.1.4", label: "02.1.4 Tricota / Buzo de abrigo" },
                    { id: "02.1.5", label: "02.1.5 Campera / Camperón" }
                ]
            },
            {
                id: "02.2",
                label: "02.2 Calzado y Accesorio",
                items: [
                    { id: "02.2.1", label: "02.2.1 Borceguí" },
                    { id: "02.2.2", label: "02.2.2 Cinto / Cinturón" },
                    { id: "02.2.3", label: "02.2.3 Gorro de fajina" }
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
                label: "03.1 Indumentaria de Gala / Media Gala",
                items: [
                    { id: "03.1.1", label: "03.1.1 Quepi / Gorro de Gala" },
                    { id: "03.1.2", label: "03.1.2 Camisa de Gala" },
                    { id: "03.1.3", label: "03.1.3 Pantalón de vestir (Gala)" },
                    { id: "03.1.4", label: "03.1.4 Corbata" },
                    { id: "03.1.5", label: "03.1.5 Cinto de Gala" },
                    { id: "03.1.6", label: "03.1.6 Guante de Gala" }
                ]
            }
        ]
    }
];
