import React, { memo } from 'react';
import { FlatList, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';

const CategoryItem = memo(({ category, onPress }) => (
    <TouchableOpacity
        style={styles.category}
        onPress={() => onPress(category.categoryId, category.name)}
    >
        <Image
            style={styles.categoryImage}
            source={category.imageUrl}
            contentFit="cover"
            cachePolicy="disk"
            placeholder={require('../placeholder.png')}
            priority='high'
            transition={200}
        />
        <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.6)']}
            style={styles.cardGradient}
            pointerEvents="none"
        />
        <Text style={styles.categoryText} numberOfLines={2} ellipsizeMode="tail">
            {category.name}
        </Text>
    </TouchableOpacity>
));

export const CategoryGrid = memo(({ categories, onCategoryPress }) => {
    const renderItem = ({ item }) => (
        <CategoryItem category={item} onPress={onCategoryPress} />
    );

    return (
        <FlatList
            data={categories}
            renderItem={renderItem}
            keyExtractor={(item) => item.categoryId.toString()}
            numColumns={2}
            scrollEnabled={false} // 부모 ScrollView 사용
            removeClippedSubviews={true} // 성능 최적화
            maxToRenderPerBatch={6}
            windowSize={5}
            initialNumToRender={6}
            getItemLayout={(data, index) => ({
                length: 150, // 카테고리 아이템 높이
                offset: 150 * index,
                index,
            })}
            columnWrapperStyle={styles.row}
        />
    );
});

const styles = StyleSheet.create({
    category: {
        flex: 1,
        margin: 8,
        height: 148,
        borderRadius: 12,
        overflow: 'hidden',
    },
    categoryImage: {
        width: '100%',
        height: '100%',
    },
    cardGradient: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: '50%',
    },
    categoryText: {
        position: 'absolute',
        bottom: 12,
        left: 12,
        right: 12,
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    row: {
        justifyContent: 'space-between',
    },
});