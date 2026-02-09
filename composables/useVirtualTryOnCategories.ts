/**
 * Composable for Virtual Try-On Category Mapping
 * Maps product categories to makeup types supported by MakeupTryOn.vue
 */

export interface MakeupType {
    id: string
    name: string
    icon: string
    defaultOpacity: number
}

export interface CategoryMapping {
    categoryId: number
    subcategoryIds: number[]
    makeupType: string
}

export const useVirtualTryOnCategories = () => {
    // Makeup types with their default settings
    const makeupTypes: Record<string, MakeupType> = {
        FOUNDATION: { id: 'FOUNDATION', name: 'كريم أساس', icon: 'fas fa-magic', defaultOpacity: 0.3 },
        CONTOUR: { id: 'CONTOUR', name: 'كونتور', icon: 'fas fa-mask', defaultOpacity: 0.25 },
        CONCEALER: { id: 'CONCEALER', name: 'كونسيلر', icon: 'fas fa-eye', defaultOpacity: 0.4 },
        BLUSH: { id: 'BLUSH', name: 'بلاشر', icon: 'fas fa-smile', defaultOpacity: 0.4 },
        LIPSTICK: { id: 'LIPSTICK', name: 'أحمر شفاه', icon: 'fas fa-palette', defaultOpacity: 0.6 },
        LIPLINER: { id: 'LIPLINER', name: 'محدد شفاه', icon: 'fas fa-pen', defaultOpacity: 0.7 },
        EYESHADOW: { id: 'EYESHADOW', name: 'ظلال عيون', icon: 'fas fa-eye-slash', defaultOpacity: 0.4 },
        EYELINER: { id: 'EYELINER', name: 'كحل / آيلاينر', icon: 'fas fa-paint-brush', defaultOpacity: 0.8 },
        MASCARA: { id: 'MASCARA', name: 'ماسكارا', icon: 'fas fa-eye', defaultOpacity: 0.9 },
        BROW: { id: 'BROW', name: 'حواجب', icon: 'fas fa-minus', defaultOpacity: 0.6 }
    }

    // Category to makeup type mapping based on the site's categories
    const categoryMappings: CategoryMapping[] = [
        // المكياج (2410)
        { categoryId: 2410, subcategoryIds: [2427], makeupType: 'FOUNDATION' },     // فاونديشين
        { categoryId: 2410, subcategoryIds: [2438], makeupType: 'CONTOUR' },        // الكونتور
        { categoryId: 2410, subcategoryIds: [2428], makeupType: 'CONCEALER' },      // الكونسيلر
        { categoryId: 2410, subcategoryIds: [2431], makeupType: 'BLUSH' },          // أحمر الخدود

        // الشفاة (2415)
        { categoryId: 2415, subcategoryIds: [2496, 2501], makeupType: 'LIPSTICK' }, // روج + روج سائل
        { categoryId: 2415, subcategoryIds: [2497], makeupType: 'LIPLINER' },       // محدد الشفايف

        // العيون (2412)
        { categoryId: 2412, subcategoryIds: [2464], makeupType: 'EYESHADOW' },      // باليت ظلال العيون
        { categoryId: 2412, subcategoryIds: [2463], makeupType: 'EYELINER' },       // كحل
        { categoryId: 2412, subcategoryIds: [2517], makeupType: 'MASCARA' },        // ماسكارا
        { categoryId: 2412, subcategoryIds: [2461], makeupType: 'BROW' },           // أقلام الحواجب
    ]

    /**
     * Check if a product supports virtual try-on
     */
    const supportsVirtualTryOn = (product: any): boolean => {
        if (!product) return false

        const categoryId = product.category_id || product.category?.id
        const subCategoryId = product.sub_category_id || product.sub_category?.id

        if (!categoryId) return false

        // Check if the category/subcategory combination is supported
        return categoryMappings.some(mapping => {
            const categoryMatches = mapping.categoryId === categoryId
            const subcategoryMatches = !subCategoryId || mapping.subcategoryIds.includes(subCategoryId)
            return categoryMatches && subcategoryMatches
        })
    }

    /**
     * Get makeup type for a product
     */
    const getMakeupType = (product: any): string | null => {
        if (!product) return null

        const categoryId = product.category_id || product.category?.id
        const subCategoryId = product.sub_category_id || product.sub_category?.id

        if (!categoryId) return null

        // Find the matching mapping
        const mapping = categoryMappings.find(m => {
            const categoryMatches = m.categoryId === categoryId
            const subcategoryMatches = !subCategoryId || m.subcategoryIds.includes(subCategoryId)
            return categoryMatches && subcategoryMatches
        })

        return mapping?.makeupType || null
    }

    /**
     * Get default opacity for a makeup type
     */
    const getDefaultOpacity = (makeupType: string): number => {
        return makeupTypes[makeupType]?.defaultOpacity || 0.5
    }

    /**
     * Get makeup type info
     */
    const getMakeupTypeInfo = (makeupType: string): MakeupType | null => {
        return makeupTypes[makeupType] || null
    }

    return {
        makeupTypes,
        categoryMappings,
        supportsVirtualTryOn,
        getMakeupType,
        getDefaultOpacity,
        getMakeupTypeInfo
    }
}
