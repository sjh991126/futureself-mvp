import React, { createContext, useState, useContext } from 'react';

const TripContext = createContext();

export const TripProvider = ({ children }) => {
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [selectedPlaces, setSelectedPlaces] = useState({});

    const updateSelectedPlaces = (day, newPlaces) => {
        setSelectedPlaces(prev => {
            const updatedPlaces = [...(prev.places || [])];
            if (!updatedPlaces[day - 1]) {
                updatedPlaces[day - 1] = [];
            }
            newPlaces.forEach(newPlace => {
                if (!updatedPlaces[day - 1].find(p => p.id === newPlace.id)) {
                    updatedPlaces[day - 1].push(newPlace);
                }
            });
            return { places: updatedPlaces };
        });
    };
    

    return (
        <TripContext.Provider value={{ 
            dateRange, 
            setDateRange, 
            selectedPlaces, 
            setSelectedPlaces,
            updateSelectedPlaces 
        }}>
            {children}
        </TripContext.Provider>
    );
};

export const useTripContext = () => useContext(TripContext);