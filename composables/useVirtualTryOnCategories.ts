/**
 * Composable for Virtual Try-On Category Mapping
 * Maps product categories to makeup types supported by MakeupTryOn.vue
 */

export interface MakeupType {
    id: string
    name: string
    icon: string
    defaultOpacity: number
    defaultColorIntensity: number
}

export interface CategoryMapping {
    categoryId: number
    subcategoryIds: number[]
    makeupType: string
}

export const useVirtualTryOnCategories = () => {
    // Makeup types with their default settings
    const makeupTypes: Record<string, MakeupType> = {
        foundation: { id: 'foundation', name: 'كريم أساس', icon: 'fas fa-magic', defaultOpacity: 0.3, defaultColorIntensity: 40 },
        contour: { id: 'contour', name: 'كونتور', icon: 'fas fa-mask', defaultOpacity: 0.25, defaultColorIntensity: 35 },
        concealer: { id: 'concealer', name: 'كونسيلر', icon: 'fas fa-eye', defaultOpacity: 0.4, defaultColorIntensity: 50 },
        blush: { id: 'blush', name: 'بلاشر', icon: 'fas fa-smile', defaultOpacity: 0.4, defaultColorIntensity: 50 },
        lip_color: { id: 'lip_color', name: 'أحمر شفاه', icon: 'fas fa-palette', defaultOpacity: 0.6, defaultColorIntensity: 60 },
        lip_liner: { id: 'lip_liner', name: 'محدد شفاه', icon: 'fas fa-pen', defaultOpacity: 0.7, defaultColorIntensity: 60 },
        eye_shadow: { id: 'eye_shadow', name: 'ظلال عيون', icon: 'fas fa-eye-slash', defaultOpacity: 0.4, defaultColorIntensity: 50 },
        eye_liner: { id: 'eye_liner', name: 'كحل / آيلاينر', icon: 'fas fa-paint-brush', defaultOpacity: 0.8, defaultColorIntensity: 70 },
        eyelashes: { id: 'eyelashes', name: 'رموش / ماسكارا', icon: 'fas fa-eye', defaultOpacity: 0.9, defaultColorIntensity: 70 },
        eyebrows: { id: 'eyebrows', name: 'حواجب', icon: 'fas fa-minus', defaultOpacity: 0.6, defaultColorIntensity: 55 }
    }

    // Category to makeup type mapping based on the site's categories
    const categoryMappings: CategoryMapping[] = [
        // المكياج (2410)
        { categoryId: 2410, subcategoryIds: [2427], makeupType: 'foundation' },     // فاونديشين
        { categoryId: 2410, subcategoryIds: [2438], makeupType: 'contour' },        // الكونتور
        { categoryId: 2410, subcategoryIds: [2428], makeupType: 'concealer' },      // الكونسيلر
        { categoryId: 2410, subcategoryIds: [2431], makeupType: 'blush' },          // أحمر الخدود

        // الشفاة (2415)
        { categoryId: 2415, subcategoryIds: [2496, 2501], makeupType: 'lip_color' }, // روج + روج سائل
        { categoryId: 2415, subcategoryIds: [2497], makeupType: 'lip_liner' },       // محدد الشفايف

        // العيون (2412)
        { categoryId: 2412, subcategoryIds: [2464], makeupType: 'eye_shadow' },      // باليت ظلال العيون
        { categoryId: 2412, subcategoryIds: [2463], makeupType: 'eye_liner' },       // كحل
        { categoryId: 2412, subcategoryIds: [2517], makeupType: 'eyelashes' },       // ماسكارا
        { categoryId: 2412, subcategoryIds: [2461], makeupType: 'eyebrows' },        // أقلام الحواجب
    ]

    /**
     * Check if a product supports virtual try-on
     * First checks API field (supports_virtual_try_on), then falls back to category mapping
     */
    const supportsVirtualTryOn = (product: any): boolean => {
        if (!product) return false

        // Check API field first
        if (product.supports_virtual_try_on !== undefined) {
            return product.supports_virtual_try_on === 1 || product.supports_virtual_try_on === true
        }

        // Fallback: check category/subcategory mapping
        const categoryId = product.category_id || product.category?.id || product.categoryId
        const subCategoryId = product.sub_category_id || product.sub_category?.id || product.subCategoryId

        if (!categoryId) return false

        return categoryMappings.some(mapping => {
            const categoryMatches = mapping.categoryId === categoryId
            const subcategoryMatches = !subCategoryId || mapping.subcategoryIds.includes(subCategoryId)
            return categoryMatches && subcategoryMatches
        })
    }

    /**
     * Get makeup type for a product
     * First checks API field (makeup_category), then falls back to category mapping
     */
    const getMakeupType = (product: any): string | null => {
        if (!product) return null

        // Check API field first
        if (product.makeup_category) {
            return product.makeup_category
        }

        // Fallback: check category/subcategory mapping
        const categoryId = product.category_id || product.category?.id || product.categoryId
        const subCategoryId = product.sub_category_id || product.sub_category?.id || product.subCategoryId

        if (!categoryId) return null

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

    const getDefaultColorIntensity = (makeupType: string): number => {
        return makeupTypes[makeupType]?.defaultColorIntensity || 50
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
        getDefaultColorIntensity,
        getMakeupTypeInfo
    }
}
