
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
                    { id: "01.1.2", label: "01.1.2 Botas de Incendio" },
                    { id: "01.1.3", label: "01.1.3 Chaquetones Estructurales" },
                    { id: "01.1.4", label: "01.1.4 Pantalones Estructurales" },
                    { id: "01.1.5", label: "01.1.5 Guantes Estructurales" },
                    { id: "01.1.6", label: "01.1.6 Esclavinas" }
                ]
            },
            {
                id: "01.2",
                label: "01.2 Forestal",
                items: [
                    { id: "01.2.1", label: "01.2.1 Cascos Forestales" },
                    { id: "01.2.2", label: "01.2.2 Chaquetas Forestales" },
                    { id: "01.2.3", label: "01.2.3 Pantalones Forestales" },
                    { id: "01.2.4", label: "01.2.4 Guantes Forestales" },
                    { id: "01.2.5", label: "01.2.5 Calzado Forestal" },
                    { id: "01.2.6", label: "01.2.6 Antiparras / Protección Ocular" }
                ]
            },
            {
                id: "01.3",
                label: "01.3 Rescate",
                items: [
                    { id: "01.3.1", label: "01.3.1 Cascos de Rescate" },
                    { id: "01.3.2", label: "01.3.2 Chaquetas de Rescate" },
                    { id: "01.3.3", label: "01.3.3 Pantalones de Rescate" },
                    { id: "01.3.4", label: "01.3.4 Guantes de Rescate" },
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
                label: "02.1 Prendas de Fajina",
                items: [
                    { id: "02.1.1", label: "02.1.1 Pantalones de fajina" },
                    { id: "02.1.2", label: "02.1.2 Remeras" },
                    { id: "02.1.3", label: "02.1.3 Camisas de fajina" },
                    { id: "02.1.4", label: "02.1.4 Tricotas / Buzos" },
                    { id: "02.1.5", label: "02.1.5 Camperas / Abrigo" }
                ]
            },
            {
                id: "02.2",
                label: "02.2 Calzado y Accesorios",
                items: [
                    { id: "02.2.1", label: "02.2.1 Borceguíes" },
                    { id: "02.2.2", label: "02.2.2 Cintos / Cinturones" },
                    { id: "02.2.3", label: "02.2.3 Gorros de fajina" }
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
                    { id: "03.1.1", label: "03.1.1 Quepis / Gorros de Gala" },
                    { id: "03.1.2", label: "03.1.2 Camisas de Gala" },
                    { id: "03.1.3", label: "03.1.3 Pantalones de Gala" },
                    { id: "03.1.4", label: "03.1.4 Corbatas" },
                    { id: "03.1.5", label: "03.1.5 Cintos de Gala" },
                    { id: "03.1.6", label: "03.1.6 Guantes de Gala" }
                ]
            }
        ]
    }
];
