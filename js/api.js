// ==================== FUNCIONES DE API ====================

const getAuthHeader = () => {
    const token = localStorage.getItem('adminToken');
    return {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
};

// ==================== USUARIOS ====================

async function getUsers() {
    try {
        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/users`,
            {
                method: 'GET',
                headers: getAuthHeader()
            }
        );

        if (!response.ok) throw new Error('Error fetching users');
        return await response.json();
    } catch (error) {
        console.error('Error:', error);
        return [];
    }
}

async function createUser(userData) {
    try {
        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/users`,
            {
                method: 'POST',
                headers: getAuthHeader(),
                body: JSON.stringify(userData)
            }
        );

        if (!response.ok) throw new Error('Error creating user');
        return await response.json();
    } catch (error) {
        console.error('Error:', error);
        return null;
    }
}

async function updateUser(userId, userData) {
    try {
        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/users?id=eq.${userId}`,
            {
                method: 'PATCH',
                headers: getAuthHeader(),
                body: JSON.stringify(userData)
            }
        );

        if (!response.ok) throw new Error('Error updating user');
        return await response.json();
    } catch (error) {
        console.error('Error:', error);
        return null;
    }
}

// ==================== RESERVAS ====================

async function getReservations(filter = null) {
    try {
        let url = `${SUPABASE_URL}/rest/v1/reservations`;

        if (filter && filter !== '') {
            url += `?status=eq.${filter}`;
        }

        const response = await fetch(url, {
            method: 'GET',
            headers: getAuthHeader()
        });

        if (!response.ok) throw new Error('Error fetching reservations');
        return await response.json();
    } catch (error) {
        console.error('Error:', error);
        return [];
    }
}

async function updateReservationStatus(reservationId, status) {
    try {
        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/reservations?id=eq.${reservationId}`,
            {
                method: 'PATCH',
                headers: getAuthHeader(),
                body: JSON.stringify({ status })
            }
        );

        if (!response.ok) throw new Error('Error updating reservation');
        return await response.json();
    } catch (error) {
        console.error('Error:', error);
        return null;
    }
}

async function cancelReservation(reservationId) {
    return updateReservationStatus(reservationId, 'cancelled');
}

// ==================== HORARIOS (SLOTS) ====================

async function getSlots() {
    try {
        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/slots`,
            {
                method: 'GET',
                headers: getAuthHeader()
            }
        );

        if (!response.ok) throw new Error('Error fetching slots');
        return await response.json();
    } catch (error) {
        console.error('Error:', error);
        return [];
    }
}

async function createSlot(slotData) {
    try {
        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/slots`,
            {
                method: 'POST',
                headers: getAuthHeader(),
                body: JSON.stringify(slotData)
            }
        );

        if (!response.ok) throw new Error('Error creating slot');
        return await response.json();
    } catch (error) {
        console.error('Error:', error);
        return null;
    }
}

async function updateSlot(slotId, slotData) {
    try {
        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/slots?id=eq.${slotId}`,
            {
                method: 'PATCH',
                headers: getAuthHeader(),
                body: JSON.stringify(slotData)
            }
        );

        if (!response.ok) throw new Error('Error updating slot');
        return await response.json();
    } catch (error) {
        console.error('Error:', error);
        return null;
    }
}

async function deleteSlot(slotId) {
    try {
        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/slots?id=eq.${slotId}`,
            {
                method: 'DELETE',
                headers: getAuthHeader()
            }
        );

        if (!response.ok) throw new Error('Error deleting slot');
        return true;
    } catch (error) {
        console.error('Error:', error);
        return false;
    }
}

// ==================== PERSONAL (STAFF) ====================

async function getStaff() {
    try {
        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/staff`,
            {
                method: 'GET',
                headers: getAuthHeader()
            }
        );

        if (!response.ok) throw new Error('Error fetching staff');
        return await response.json();
    } catch (error) {
        console.error('Error:', error);
        return [];
    }
}

async function createStaff(staffData) {
    try {
        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/staff`,
            {
                method: 'POST',
                headers: getAuthHeader(),
                body: JSON.stringify(staffData)
            }
        );

        if (!response.ok) throw new Error('Error creating staff');
        return await response.json();
    } catch (error) {
        console.error('Error:', error);
        return null;
    }
}

async function updateStaff(staffId, staffData) {
    try {
        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/staff?id=eq.${staffId}`,
            {
                method: 'PATCH',
                headers: getAuthHeader(),
                body: JSON.stringify(staffData)
            }
        );

        if (!response.ok) throw new Error('Error updating staff');
        return await response.json();
    } catch (error) {
        console.error('Error:', error);
        return null;
    }
}

// ==================== EQUIPAMIENTO ====================

async function getEquipment() {
    try {
        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/equipment`,
            {
                method: 'GET',
                headers: getAuthHeader()
            }
        );

        if (!response.ok) throw new Error('Error fetching equipment');
        return await response.json();
    } catch (error) {
        console.error('Error:', error);
        return [];
    }
}

async function createEquipment(equipmentData) {
    try {
        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/equipment`,
            {
                method: 'POST',
                headers: getAuthHeader(),
                body: JSON.stringify(equipmentData)
            }
        );

        if (!response.ok) throw new Error('Error creating equipment');
        return await response.json();
    } catch (error) {
        console.error('Error:', error);
        return null;
    }
}

async function updateEquipment(equipmentId, equipmentData) {
    try {
        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/equipment?id=eq.${equipmentId}`,
            {
                method: 'PATCH',
                headers: getAuthHeader(),
                body: JSON.stringify(equipmentData)
            }
        );

        if (!response.ok) throw new Error('Error updating equipment');
        return await response.json();
    } catch (error) {
        console.error('Error:', error);
        return null;
    }
}

// ==================== ESTADÍSTICAS ====================

async function getStatistics() {
    try {
        const [users, reservations, slots, equipment] = await Promise.all([
            getUsers(),
            getReservations(),
            getSlots(),
            getEquipment()
        ]);

        const todayReservations = reservations.filter(r => {
            const resDate = new Date(r.created_at).toDateString();
            const today = new Date().toDateString();
            return resDate === today;
        });

        return {
            totalUsers: users.length,
            todayReservations: todayReservations.length,
            totalSlots: slots.length,
            totalEquipment: equipment.length,
            maintenanceEquipment: equipment.filter(e => e.status === 'maintenance').length
        };
    } catch (error) {
        console.error('Error:', error);
        return {};
    }
}
