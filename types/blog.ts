export interface Category {
    category: {
        name: string;
        slug: string;
        description: string;
        parent_id: string;
        seo_title: string;
        seo_description: string;
    }
    
}

export interface Tag {
    tag: {
        name: string;
        slug: string;
        description: string;
    }
}