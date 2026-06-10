import { useEffect, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchUser } from '../../slices/userSlice';
import { fetchLocation } from '../../slices/locationSlice';
import { loadCategories } from '../../slices/categoriesSlice';
import { preloadAllCategoriesData, initializeCache } from '../api/category_triplists';

export const useInitialData = () => {
    const dispatch = useDispatch();
    const [isReady, setIsReady] = useState(false);
    const [error, setError] = useState(null);
    const hasLoaded = useRef(false);

    const user = useSelector((state) => state.user.data);
    const location = useSelector((state) => state.location.data);
    const categories = useSelector((state) => state.categories.data);

    useEffect(() => {
        if (hasLoaded.current || (user && location && categories?.length)) {
            setIsReady(true);
            return;
        }

        let isMounted = true;

        const loadData = async () => {
            try {
                const results = await Promise.allSettled([
                    !user ? dispatch(fetchUser()).unwrap() : Promise.resolve(user),
                    !location ? dispatch(fetchLocation()).unwrap() : Promise.resolve(location),
                    !categories?.length ? dispatch(loadCategories()).unwrap() : Promise.resolve(categories),
                ]);

                const criticalErrors = results
                    .slice(0, 1) // user만 필수
                    .filter(r => r.status === 'rejected');

                if (criticalErrors.length > 0 && isMounted) {
                    setError(criticalErrors[0].reason);
                }

                const warnings = results
                    .slice(1) // location, categories는 선택적
                    .filter(r => r.status === 'rejected');

                if (warnings.length > 0) {
                    console.warn('Non-critical data failed to load:', warnings);
                }

                // 프리로드는 로드된 카테고리 사용
                if (isMounted) {
                    // results[2]는 categories 결과
                    const loadedCategories = results[2].status === 'fulfilled'
                        ? results[2].value
                        : categories;

                    if (loadedCategories?.length) {
                        try {
                            await initializeCache();
                            const ids = loadedCategories.map(c => c.categoryId);
                            // 백그라운드 실행 (await 제거)
                            // preloadAllCategoriesData(ids);
                        } catch (e) {
                            console.warn('Failed to preload categories:', e);
                        }
                    }

                    hasLoaded.current = true;
                    setIsReady(true);
                }
            } catch (err) {
                console.error('Error loading initial data:', err);
                if (isMounted) {
                    setError(err);
                    setIsReady(true);
                }
            }
        };

        loadData();

        return () => {
            isMounted = false;
        };
    }, [user, location, categories]);

    return { isReady, error, user, location, categories };
};