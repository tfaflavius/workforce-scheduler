import React, { useState, useMemo, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Chip,
  IconButton,
  Tooltip,
  useTheme,
  useMediaQuery,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon,
  Clear as ClearIcon,
  Group as GroupIcon,
  Send as SendIcon,
} from '@mui/icons-material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useCreateScheduleMutation, useUpdateScheduleMutation, useGetSchedulesQuery, useGetShiftTypesQuery, useGetWorkPositionsQuery } from '../../store/api/schedulesApi';
import { useGetUsersQuery } from '../../store/api/users.api';
import { useGetApprovedLeavesByMonthQuery } from '../../store/api/leaveRequests.api';
import { DISPECERAT_DEPARTMENT_NAME, CONTROL_DEPARTMENT_NAME, MAINTENANCE_DEPARTMENT_NAME } from '../../constants/departments';
import { useAppSelector } from '../../store/hooks';
import type { ScheduleAssignmentDto, ScheduleStatus } from '../../types/schedule.types';

// Tipuri de ture
type ShiftPatternType = '12H' | '8H';

interface ShiftOption {
  id: string;
  label: string;
  shortLabel: string;
  startTime: string;
  endTime: string;
  color: string;
  isNightShift: boolean;
  isVacation: boolean;
}

// Optiuni pentru tura de 12 ore
const SHIFT_OPTIONS_12H: ShiftOption[] = [
  { id: 'day_12', label: 'Zi 07-19', shortLabel: 'Z', startTime: '07:00', endTime: '19:00', color: '#4CAF50', isNightShift: false, isVacation: false },
  { id: 'night_12', label: 'Noapte 19-07', shortLabel: 'N', startTime: '19:00', endTime: '07:00', color: '#3F51B5', isNightShift: true, isVacation: false },
  { id: 'vacation_12', label: 'Concediu', shortLabel: 'CO', startTime: '', endTime: '', color: '#FF9800', isNightShift: false, isVacation: true },
];

// Optiuni pentru tura de 8 ore
const SHIFT_OPTIONS_8H: ShiftOption[] = [
  { id: 'day1_8', label: 'Zi 06-14', shortLabel: 'Z1', startTime: '06:00', endTime: '14:00', color: '#00BCD4', isNightShift: false, isVacation: false },
  { id: 'day2_8', label: 'Zi 14-22', shortLabel: 'Z2', startTime: '14:00', endTime: '22:00', color: '#9C27B0', isNightShift: false, isVacation: false },
  { id: 'day3_8', label: 'Zi 07:30-15:30', shortLabel: 'Z3', startTime: '07:30', endTime: '15:30', color: '#795548', isNightShift: false, isVacation: false },
  { id: 'day4_8', label: 'Zi 09-17', shortLabel: 'Z4', startTime: '09:00', endTime: '17:00', color: '#009688', isNightShift: false, isVacation: false },
  { id: 'day5_8', label: 'Zi 08-16', shortLabel: 'Z5', startTime: '08:00', endTime: '16:00', color: '#FF5722', isNightShift: false, isVacation: false },
  { id: 'day6_8', label: 'Zi 13-21', shortLabel: 'Z6', startTime: '13:00', endTime: '21:00', color: '#673AB7', isNightShift: false, isVacation: false },
  { id: 'night_8', label: 'Noapte 22-06', shortLabel: 'N8', startTime: '22:00', endTime: '06:00', color: '#E91E63', isNightShift: true, isVacation: false },
  { id: 'vacation_8', label: 'Concediu', shortLabel: 'CO', startTime: '', endTime: '', color: '#FF9800', isNightShift: false, isVacation: true },
];

// Genereaza lista de luni pentru anul 2026 (toate cele 12 luni)
const generateMonthOptions = () => {
  const options = [];
  const year = 2026;

  for (let month = 0; month < 12; month++) {
    const date = new Date(year, month, 1);
    const value = `${year}-${String(month + 1).padStart(2, '0')}`;
    const label = date.toLocaleDateString('ro-RO', {
      year: 'numeric',
      month: 'long',
    });
    options.push({ value, label });
  }

  return options;
};

const CreateSchedulePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { user: currentUser } = useAppSelector((state) => state.auth);

  // Verifica rolul utilizatorului
  const isAdmin = currentUser?.role === 'ADMIN';
  const isManager = currentUser?.role === 'MANAGER';

  // Obtine parametrii din URL
  const urlUserId = searchParams.get('userId');
  const urlMonth = searchParams.get('month');

  // State
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [shiftPattern, setShiftPattern] = useState<ShiftPatternType>('12H');
  const [monthYear, setMonthYear] = useState(() => {
    if (urlMonth) return urlMonth;
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  // Pozitia de lucru pentru fiecare zi: { date: workPositionId }
  const [workPositions, setWorkPositions] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Lista de luni (generata o singura data)
  const monthOptions = useMemo(() => generateMonthOptions(), []);

  // API hooks
  const { data: users = [], isLoading: usersLoading } = useGetUsersQuery({ isActive: true });
  const { data: existingSchedules = [] } = useGetSchedulesQuery({ monthYear });
  const { data: dbShiftTypes = [] } = useGetShiftTypesQuery();
  const { data: dbWorkPositions = [], error: workPositionsError, isLoading: workPositionsLoading } = useGetWorkPositionsQuery();
  const { data: approvedLeaves = [] } = useGetApprovedLeavesByMonthQuery(monthYear);

  // Log work positions status
  useEffect(() => {
    console.log('Work Positions Status:', {
      loading: workPositionsLoading,
      error: workPositionsError,
      count: dbWorkPositions.length,
      data: dbWorkPositions,
    });
  }, [dbWorkPositions, workPositionsError, workPositionsLoading]);
  const [createSchedule, { isLoading: creating, error }] = useCreateScheduleMutation();
  const [updateSchedule, { isLoading: updating }] = useUpdateScheduleMutation();

  // Mapeaza shift types din DB la optiunile locale
  const getShiftTypeId = (localId: string): string | null => {
    // Log pentru debugging
    console.log('Looking for shift type:', localId);
    console.log('Available DB shift types:', dbShiftTypes);

    // Mapare bazata pe numele din DB
    const nameMapping: Record<string, string> = {
      'day_12': 'Zi 07-19',
      'night_12': 'Noapte 19-07',
      'vacation_12': 'Concediu 12H',
      'day1_8': 'Zi 06-14',
      'day2_8': 'Zi 14-22',
      'day3_8': 'Zi 07:30-15:30',
      'day4_8': 'Zi 09-17',
      'day5_8': 'Zi 08-16',
      'day6_8': 'Zi 13-21',
      'night_8': 'Noapte 22-06',
      'vacation_8': 'Concediu 8H',
    };

    const expectedName = nameMapping[localId];
    if (!expectedName) {
      console.warn(`No name mapping for localId: ${localId}`);
      return null;
    }

    // Gaseste shift type in DB dupa nume exact
    const dbShift = dbShiftTypes.find(st => st.name === expectedName);

    if (dbShift) {
      console.log(`Found match for ${localId}:`, dbShift);
      return dbShift.id;
    }

    // Fallback - cauta dupa pattern in nume
    const isVacation = localId.includes('vacation');
    const pattern = localId.includes('_12') ? 'SHIFT_12H' : 'SHIFT_8H';

    const fallbackShift = dbShiftTypes.find(st => {
      if (isVacation) {
        return (st.name.toLowerCase().includes('concediu') || st.name.toLowerCase().includes('vacation')) &&
               st.shiftPattern === pattern;
      }
      return st.shiftPattern === pattern && st.name.includes(expectedName.split(' ')[1] || '');
    });

    if (fallbackShift) {
      console.log(`Found fallback match for ${localId}:`, fallbackShift);
      return fallbackShift.id;
    }

    console.warn(`No matching shift type found for ${localId}`);
    return null;
  };

  // Seteaza utilizatorul din URL daca exista
  useEffect(() => {
    if (urlUserId && users.length > 0) {
      const userExists = users.find(u => u.id === urlUserId);
      if (userExists) {
        setSelectedUserId(urlUserId);
      }
    }
  }, [urlUserId, users]);

  // Filtram doar angajatii si managerii (nu adminii) si sortam dupa departament
  const eligibleUsers = useMemo(() => {
    const filtered = users.filter(u => u.role === 'USER' || u.role === 'MANAGER');

    // Sortare dupa departament: Dispecerat → Control → Intretinere Parcari
    const departmentOrder: Record<string, number> = {
      [DISPECERAT_DEPARTMENT_NAME]: 1,
      [CONTROL_DEPARTMENT_NAME]: 2,
      [MAINTENANCE_DEPARTMENT_NAME]: 3,
    };

    filtered.sort((a, b) => {
      const deptA = a.department?.name || '';
      const deptB = b.department?.name || '';

      const orderA = departmentOrder[deptA] || 99;
      const orderB = departmentOrder[deptB] || 99;

      // Prima sortare: dupa departament
      if (orderA !== orderB) {
        return orderA - orderB;
      }

      // A doua sortare: alfabetic dupa nume in cadrul aceluiasi departament
      return a.fullName.localeCompare(b.fullName);
    });

    return filtered;
  }, [users]);

  // Obtine utilizatorul selectat
  const selectedUser = useMemo(() => {
    return eligibleUsers.find(u => u.id === selectedUserId);
  }, [eligibleUsers, selectedUserId]);

  // Determina pozitia de lucru implicita in functie de departamentul utilizatorului
  const getDefaultPositionForUser = useMemo(() => {
    if (!selectedUser || dbWorkPositions.length === 0) return null;

    const userDepartment = selectedUser.department?.name?.toLowerCase() || '';

    // Intretinere Parcari → pozitia implicita este Intretinere Parcari
    if (userDepartment.includes('intretinere')) {
      const pos = dbWorkPositions.find(
        p => p.name.toLowerCase().includes('intretinere')
      );
      return pos?.id || dbWorkPositions[0].id;
    }

    // Departamente de birou → pozitia implicita este Birouri
    const officeDepNames = ['parcari handicap', 'parcari domiciliu', 'achizitii', 'parcometre', 'procese verbale'];
    if (officeDepNames.some(d => userDepartment.includes(d))) {
      const pos = dbWorkPositions.find(
        p => p.name.toLowerCase().includes('birouri') || p.shortName.toLowerCase() === 'b'
      );
      return pos?.id || dbWorkPositions[0].id;
    }

    // Daca userul este de la Control, pozitia implicita este Control
    if (userDepartment.includes('control')) {
      const controlPosition = dbWorkPositions.find(
        p => p.name.toLowerCase().includes('control') || p.shortName.toLowerCase() === 'ctrl' || p.shortName.toLowerCase() === 'c'
      );
      return controlPosition?.id || dbWorkPositions[0].id;
    }

    // Pentru Dispecerat sau orice alt departament, pozitia implicita este Dispecerat
    const dispeceratPosition = dbWorkPositions.find(
      p => p.name.toLowerCase().includes('dispecerat') || p.shortName.toLowerCase() === 'disp' || p.shortName.toLowerCase() === 'd'
    );
    return dispeceratPosition?.id || dbWorkPositions[0].id;
  }, [selectedUser, dbWorkPositions]);

  // Filtreaza si sorteaza pozitiile de lucru in functie de departamentul utilizatorului
  // Arata TOATE pozitiile dar cu cele relevante departamentului primele (pentru override manual)
  const filteredWorkPositions = useMemo(() => {
    if (!selectedUser || dbWorkPositions.length === 0) return dbWorkPositions;

    const userDepartment = selectedUser.department?.name?.toLowerCase() || '';

    // Determina care pozitii sunt "relevante" pentru departamentul curent
    const isRelevant = (p: typeof dbWorkPositions[0]): boolean => {
      if (userDepartment.includes('intretinere')) {
        return p.name.toLowerCase().includes('intretinere') || p.shortName.toLowerCase() === 'ip';
      }

      const officeDepNames = ['parcari handicap', 'parcari domiciliu', 'achizitii', 'parcometre', 'procese verbale'];
      if (officeDepNames.some(d => userDepartment.includes(d))) {
        return p.name.toLowerCase().includes('birouri') || p.shortName.toLowerCase() === 'b';
      }

      if (userDepartment.includes('dispecerat') || userDepartment.includes('control')) {
        return p.name.toLowerCase().includes('dispecerat') || p.name.toLowerCase().includes('control') ||
          p.shortName.toLowerCase() === 'disp' || p.shortName.toLowerCase() === 'ctrl' ||
          p.shortName.toLowerCase() === 'd' || p.shortName.toLowerCase() === 'c';
      }

      return true; // Alte departamente - toate sunt relevante
    };

    // Sorteaza: pozitiile relevante primele, apoi restul
    const sorted = [...dbWorkPositions].sort((a, b) => {
      const aRelevant = isRelevant(a);
      const bRelevant = isRelevant(b);
      if (aRelevant && !bRelevant) return -1;
      if (!aRelevant && bRelevant) return 1;
      return a.displayOrder - b.displayOrder;
    });

    return sorted;
  }, [selectedUser, dbWorkPositions]);

  // Obtine optiunile de tura in functie de tipul selectat
  const shiftOptions = shiftPattern === '12H' ? SHIFT_OPTIONS_12H : SHIFT_OPTIONS_8H;

  // Genereaza zilele lunii
  const daysInMonth = useMemo(() => {
    const [year, month] = monthYear.split('-').map(Number);
    const date = new Date(year, month, 0);
    return date.getDate();
  }, [monthYear]);

  const calendarDays = useMemo(() => {
    const [year, month] = monthYear.split('-').map(Number);
    const days = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day);
      days.push({
        day,
        date: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
        dayOfWeek: date.toLocaleDateString('ro-RO', { weekday: 'short' }),
        isWeekend: date.getDay() === 0 || date.getDay() === 6,
      });
    }
    return days;
  }, [monthYear, daysInMonth]);

  // Creeaza un map cu toate asignarile existente pentru toti angajatii + scheduleId
  const allUsersAssignments = useMemo(() => {
    const userAssignmentsMap: Record<string, Record<string, { shiftId: string; notes: string; workPositionId?: string }>> = {};

    existingSchedules.forEach(schedule => {
      if (schedule.assignments) {
        schedule.assignments.forEach(assignment => {
          if (!userAssignmentsMap[assignment.userId]) {
            userAssignmentsMap[assignment.userId] = {};
          }
          // Normalizeaza data pentru a evita probleme cu timezone
          // shiftDate poate veni ca "2026-02-02" sau "2026-02-02T00:00:00.000Z"
          const normalizedDate = assignment.shiftDate.split('T')[0];
          // Valideaza workPositionId - accepta daca exista in dbWorkPositions
          const wpId = assignment.workPositionId;
          const existsInDb = wpId && dbWorkPositions.some(p => p.id === wpId);
          userAssignmentsMap[assignment.userId][normalizedDate] = {
            shiftId: assignment.shiftTypeId,
            notes: assignment.notes || '',
            workPositionId: existsInDb ? wpId : undefined,
          };
        });
      }
    });

    return userAssignmentsMap;
  }, [existingSchedules, dbWorkPositions]);

  // Gaseste scheduleId-ul existent pentru un user in luna curenta
  const getExistingScheduleId = (userId: string): string | null => {
    for (const schedule of existingSchedules) {
      if (schedule.assignments?.some(a => a.userId === userId)) {
        return schedule.id;
      }
    }
    return null;
  };

  // Referinta pentru a tine minte ce combinatie user+month a fost incarcata
  const [loadedKey, setLoadedKey] = useState<string | null>(null);

  // Verifica daca existingSchedules s-au incarcat (nu mai e loading)
  const { isLoading: schedulesLoading } = useGetSchedulesQuery({ monthYear });

  // Incarca asignarile existente ale utilizatorului selectat cand se editeaza
  useEffect(() => {
    // Nu face nimic daca nu avem user selectat
    if (!selectedUserId) {
      setAssignments({});
      setLoadedKey(null);
      return;
    }

    // Asteapta sa se incarce datele
    if (schedulesLoading) {
      console.log('Waiting for schedules to load...');
      return;
    }

    // Creeaza o cheie unica pentru combinatia user + month
    const currentKey = `${selectedUserId}-${monthYear}`;

    // Nu reincarca daca e aceeasi combinatie
    if (currentKey === loadedKey) {
      return;
    }

    // Daca s-a schimbat userul sau luna, incearca sa incarce asignarile
    const userExistingAssignments = allUsersAssignments[selectedUserId];

    console.log('Checking assignments for user:', selectedUserId, 'month:', monthYear);
    console.log('All users assignments:', allUsersAssignments);
    console.log('User existing assignments:', userExistingAssignments);

    if (userExistingAssignments && Object.keys(userExistingAssignments).length > 0) {
      // Converteste asignarile din DB la formatul local (cu id-uri locale)
      const loadedAssignments: Record<string, string> = {};
      const loadedWorkPositions: Record<string, string> = {};
      let detectedPattern: ShiftPatternType | null = null;

      // Prima trecere - detecteaza pattern-ul
      Object.entries(userExistingAssignments).forEach(([, assignment]) => {
        const notes = assignment.notes;
        if (notes.includes('07:00-19:00') || notes.includes('19:00-07:00')) {
          detectedPattern = '12H';
        } else if (notes.includes('06:00-14:00') || notes.includes('14:00-22:00') ||
                   notes.includes('07:30-15:30') || notes.includes('09:00-17:00') ||
                   notes.includes('08:00-16:00') || notes.includes('13:00-21:00') ||
                   notes.includes('22:00-06:00')) {
          detectedPattern = '8H';
        }
      });

      // A doua trecere - mapeaza asignarile si pozitiile
      Object.entries(userExistingAssignments).forEach(([date, assignment]) => {
        const notes = assignment.notes;

        // Mapare notes -> local shift id
        let localShiftId = '';
        // Check for leave (can be "Concediu" or "Concediu: Concediu de Odihna" etc.)
        if (notes === 'Concediu' || notes?.startsWith('Concediu:') || notes?.includes('Concediu')) {
          // Determina daca e 12H sau 8H bazat pe pattern-ul detectat sau default 12H
          localShiftId = detectedPattern === '8H' ? 'vacation_8' : 'vacation_12';
        } else if (notes.includes('07:00-19:00')) {
          localShiftId = 'day_12';
        } else if (notes.includes('19:00-07:00')) {
          localShiftId = 'night_12';
        } else if (notes.includes('06:00-14:00')) {
          localShiftId = 'day1_8';
        } else if (notes.includes('14:00-22:00')) {
          localShiftId = 'day2_8';
        } else if (notes.includes('07:30-15:30')) {
          localShiftId = 'day3_8';
        } else if (notes.includes('09:00-17:00')) {
          localShiftId = 'day4_8';
        } else if (notes.includes('08:00-16:00')) {
          localShiftId = 'day5_8';
        } else if (notes.includes('13:00-21:00')) {
          localShiftId = 'day6_8';
        } else if (notes.includes('22:00-06:00')) {
          localShiftId = 'night_8';
        }

        if (localShiftId) {
          loadedAssignments[date] = localShiftId;
          // Incarca pozitia de lucru daca exista in dbWorkPositions
          const wpId = assignment.workPositionId;
          const existsInDb = wpId && dbWorkPositions.some(p => p.id === wpId);
          if (existsInDb) {
            loadedWorkPositions[date] = wpId;
          } else if (dbWorkPositions.length > 0) {
            // Daca nu exista pozitie valida in DB, seteaza default-ul bazat pe departament
            const defaultPos = getDefaultPositionForUser || dbWorkPositions[0].id;
            loadedWorkPositions[date] = defaultPos;
          }
        }
      });

      // Seteaza tipul de tura detectat
      if (detectedPattern) {
        setShiftPattern(detectedPattern);
      }

      // Pre-populeaza si cu concedii aprobate care nu sunt inca in program
      const userLeaves = approvedLeaves.filter(leave => leave.userId === selectedUserId);
      if (userLeaves.length > 0) {
        userLeaves.forEach(leave => {
          leave.dates.forEach(date => {
            // Adauga doar daca nu exista deja o asignare pentru acea zi
            if (!loadedAssignments[date]) {
              const vacationId = detectedPattern === '8H' ? 'vacation_8' : 'vacation_12';
              loadedAssignments[date] = vacationId;
              console.log('✅ Pre-populating leave day:', date, 'with', vacationId);
            }
          });
        });
      }

      // Seteaza asignarile si pozitiile incarcate
      console.log('✅ Loading existing assignments for user:', selectedUserId, loadedAssignments);
      console.log('✅ Loading existing work positions:', loadedWorkPositions);
      setAssignments(loadedAssignments);
      setWorkPositions(loadedWorkPositions);
      setLoadedKey(currentKey);
    } else {
      // Nu are asignari existente - verifica daca are concedii aprobate
      console.log('⚠️ No existing assignments for user:', selectedUserId, 'in month:', monthYear);

      // Pre-populeaza cu concedii aprobate daca exista
      const userLeaves = approvedLeaves.filter(leave => leave.userId === selectedUserId);
      if (userLeaves.length > 0) {
        const leaveAssignments: Record<string, string> = {};
        userLeaves.forEach(leave => {
          leave.dates.forEach(date => {
            // Foloseste vacation_12 sau vacation_8 in functie de pattern
            leaveAssignments[date] = shiftPattern === '8H' ? 'vacation_8' : 'vacation_12';
          });
        });
        console.log('✅ Pre-populating with approved leaves:', leaveAssignments);
        setAssignments(leaveAssignments);
      } else {
        setAssignments({});
      }
      setLoadedKey(currentKey);
    }
  }, [selectedUserId, monthYear, allUsersAssignments, loadedKey, schedulesLoading, approvedLeaves, shiftPattern]);

  // Handler pentru schimbarea turei unei zile
  const handleDayShiftChange = (date: string, shiftId: string) => {
    console.log('=== SHIFT CHANGE ===', { date, shiftId });
    setAssignments(prev => {
      const newAssignments = shiftId === ''
        ? (({ [date]: _, ...rest }) => rest)(prev)
        : { ...prev, [date]: shiftId };
      console.log('New assignments state:', newAssignments);
      console.log('Total assignments:', Object.keys(newAssignments).length);
      return newAssignments;
    });
    // Daca sterge tura, sterge si pozitia
    if (shiftId === '') {
      setWorkPositions(prev => {
        const { [date]: _, ...rest } = prev;
        return rest;
      });
    } else if (!workPositions[date] && dbWorkPositions.length > 0) {
      // Seteaza pozitia default in functie de departamentul utilizatorului
      // Control -> Control, Dispecerat/altele -> Dispecerat
      const defaultPositionId = getDefaultPositionForUser || dbWorkPositions[0].id;
      console.log('Setting default position for user department:', selectedUser?.department?.name, '->', defaultPositionId);
      setWorkPositions(prev => ({
        ...prev,
        [date]: defaultPositionId,
      }));
    }
  };

  // Handler pentru schimbarea pozitiei de lucru
  const handleWorkPositionChange = (date: string, positionId: string) => {
    console.log('=== POSITION CHANGE ===', { date, positionId });
    setWorkPositions(prev => ({
      ...prev,
      [date]: positionId,
    }));
  };

  // Curata toate asignarile
  const handleClearAll = () => {
    setAssignments({});
    setWorkPositions({});
  };

  // Creeaza lista de asignari
  const createAssignmentDtos = (): ScheduleAssignmentDto[] => {
    const validAssignments: ScheduleAssignmentDto[] = [];

    // Default work position ID - in functie de departamentul utilizatorului
    // Control -> Control, Dispecerat/altele -> Dispecerat
    const defaultPositionId = getDefaultPositionForUser || (dbWorkPositions.length > 0 ? dbWorkPositions[0].id : null);

    console.log('Creating assignments with dbWorkPositions:', dbWorkPositions);
    console.log('Default position ID (based on user department):', defaultPositionId);
    console.log('User department:', selectedUser?.department?.name);

    Object.entries(assignments).forEach(([date, localShiftId]) => {
      const shiftOption = shiftOptions.find(s => s.id === localShiftId);
      const dbShiftTypeId = getShiftTypeId(localShiftId);

      if (!dbShiftTypeId) {
        console.warn(`No matching shift type found for ${localShiftId}`);
        return;
      }

      // Creeaza assignment-ul de baza FARA workPositionId
      // workPositionId va fi adaugat doar daca avem pozitii valide din DB
      const assignment: ScheduleAssignmentDto = {
        userId: selectedUserId,
        shiftTypeId: dbShiftTypeId,
        shiftDate: date,
        notes: shiftOption?.isVacation ? 'Concediu' : `${shiftOption?.startTime}-${shiftOption?.endTime}`,
      };

      // IMPORTANT: Adauga workPositionId DOAR daca:
      // 1. Avem pozitii incarcate din DB (dbWorkPositions.length > 0)
      // 2. Avem o pozitie valida (fie salvata, fie default)
      // 3. Pozitia exista in dbWorkPositions (validare prin existenta, nu prin format UUID)
      if (dbWorkPositions.length > 0) {
        const savedPositionId = workPositions[date];
        const existsInDb = (id: string) => id && dbWorkPositions.some(p => p.id === id);

        console.log(`Position for ${date}: saved=${savedPositionId}, default=${defaultPositionId}`);

        // Verifica daca pozitia salvata exista in DB
        if (savedPositionId && existsInDb(savedPositionId)) {
          assignment.workPositionId = savedPositionId;
          console.log(`  -> Using SAVED position: ${savedPositionId}`);
        } else if (defaultPositionId && existsInDb(defaultPositionId)) {
          // Foloseste default doar daca exista in DB
          assignment.workPositionId = defaultPositionId;
          console.log(`  -> Using DEFAULT position: ${defaultPositionId}`);
        }
        // Daca nici una nu exista in DB, NU adaugam workPositionId deloc
      }
      // Daca dbWorkPositions e gol, NU adaugam workPositionId

      validAssignments.push(assignment);
    });

    return validAssignments;
  };

  // Salveaza programul (pentru Admin - salveaza direct)
  const handleSave = async () => {
    if (!selectedUserId) return;

    try {
      const assignmentDtos = createAssignmentDtos();

      // Verifica ca s-au creat assignments
      if (assignmentDtos.length === 0 && Object.keys(assignments).length > 0) {
        setErrorMessage('Nu s-au putut crea asignarile. Verifica ca datele sunt corecte.');
        return;
      }

      const selectedUser = eligibleUsers.find(u => u.id === selectedUserId);
      const existingScheduleId = getExistingScheduleId(selectedUserId);

      // Debug logging
      console.log('=== SAVE DEBUG ===');
      console.log('Selected User ID:', selectedUserId);
      console.log('Month Year:', monthYear);
      console.log('Existing Schedule ID:', existingScheduleId);
      console.log('Assignments from state:', assignments);
      console.log('Assignment DTOs to send:', JSON.stringify(assignmentDtos, null, 2));
      console.log('Number of assignments:', assignmentDtos.length);

      // Verificare finala: toate workPositionId trebuie sa existe in dbWorkPositions
      const invalidAssignments = assignmentDtos.filter(a =>
        a.workPositionId !== undefined &&
        !dbWorkPositions.some(p => p.id === a.workPositionId)
      );
      if (invalidAssignments.length > 0) {
        console.error('❌ Found invalid workPositionIds:', invalidAssignments);
        setErrorMessage('Eroare interna: pozitii de lucru invalide detectate. Reincarcati pagina.');
        return;
      }

      if (existingScheduleId) {
        // UPDATE programul existent
        console.log('📝 Updating existing schedule:', existingScheduleId);
        await updateSchedule({
          id: existingScheduleId,
          data: {
            assignments: assignmentDtos,
            status: (isAdmin ? 'APPROVED' : 'DRAFT') as ScheduleStatus,
          }
        }).unwrap();

        setSuccessMessage(isAdmin
          ? 'Programul a fost actualizat si aprobat cu succes!'
          : 'Programul a fost actualizat ca draft.');
      } else {
        // CREATE program nou
        console.log('🆕 Creating new schedule');
        const requestBody = {
          monthYear,
          assignments: assignmentDtos,
          notes: `Program pentru ${selectedUser?.fullName || 'utilizator'} - Tura ${shiftPattern}`,
          status: (isAdmin ? 'APPROVED' : 'DRAFT') as ScheduleStatus,
        };
        console.log('Full request body:', JSON.stringify(requestBody, null, 2));

        await createSchedule(requestBody).unwrap();

        setSuccessMessage(isAdmin
          ? 'Programul a fost salvat si aprobat cu succes!'
          : 'Programul a fost salvat ca draft.');
      }

      setTimeout(() => navigate('/schedules'), 1500);
    } catch (err: unknown) {
      console.error('Failed to save schedule:', err);
      const errorMsg = err && typeof err === 'object' && 'data' in err
        ? (err.data as { message?: string })?.message || 'A aparut o eroare la salvarea programului.'
        : 'A aparut o eroare la salvarea programului.';
      setErrorMessage(errorMsg);
      setTimeout(() => setErrorMessage(null), 5000);
    }
  };

  // Salveaza si trimite pentru aprobare (pentru Manager)
  const handleSaveAndSubmit = async () => {
    if (!selectedUserId) return;

    try {
      const assignmentDtos = createAssignmentDtos();

      // Verifica ca s-au creat assignments
      if (assignmentDtos.length === 0 && Object.keys(assignments).length > 0) {
        setErrorMessage('Nu s-au putut crea asignarile. Verifica ca datele sunt corecte.');
        return;
      }

      const selectedUser = eligibleUsers.find(u => u.id === selectedUserId);
      const existingScheduleId = getExistingScheduleId(selectedUserId);

      if (existingScheduleId) {
        // UPDATE programul existent
        console.log('📝 Updating existing schedule for approval:', existingScheduleId);
        await updateSchedule({
          id: existingScheduleId,
          data: {
            assignments: assignmentDtos,
            status: 'PENDING_APPROVAL' as ScheduleStatus,
          }
        }).unwrap();
      } else {
        // CREATE program nou
        console.log('🆕 Creating new schedule for approval');
        await createSchedule({
          monthYear,
          assignments: assignmentDtos,
          notes: `Program pentru ${selectedUser?.fullName || 'utilizator'} - Tura ${shiftPattern}`,
          status: 'PENDING_APPROVAL' as ScheduleStatus,
        }).unwrap();
      }

      setSuccessMessage('Programul a fost trimis pentru aprobare. Un administrator il va revizui.');
      setTimeout(() => navigate('/schedules'), 2000);
    } catch (err: unknown) {
      console.error('Failed to submit schedule:', err);
      const errorMsg = err && typeof err === 'object' && 'data' in err
        ? (err.data as { message?: string })?.message || 'A aparut o eroare la trimiterea programului.'
        : 'A aparut o eroare la trimiterea programului.';
      setErrorMessage(errorMsg);
      setTimeout(() => setErrorMessage(null), 5000);
    }
  };

  // Obtine culoarea pentru o zi
  const getDayColor = (date: string) => {
    const shiftId = assignments[date];
    if (!shiftId) return 'transparent';
    const shift = shiftOptions.find(s => s.id === shiftId);
    return shift?.color || 'transparent';
  };

  // Obtine info pentru o asignare existenta
  const getExistingShiftInfo = (notes: string) => {
    // Check for leave (can be "Concediu" or "Concediu: Concediu de Odihna" etc.)
    if (notes === 'Concediu' || notes?.startsWith('Concediu:') || notes?.includes('Concediu')) {
      return { label: 'CO', color: '#FF9800' };
    }
    if (notes.includes('07:00-19:00')) {
      return { label: 'Z', color: '#4CAF50' };
    }
    if (notes.includes('19:00-07:00')) {
      return { label: 'N', color: '#3F51B5' };
    }
    if (notes.includes('06:00-14:00')) {
      return { label: 'Z1', color: '#00BCD4' };
    }
    if (notes.includes('14:00-22:00')) {
      return { label: 'Z2', color: '#9C27B0' };
    }
    if (notes.includes('07:30-15:30')) {
      return { label: 'Z3', color: '#795548' };
    }
    if (notes.includes('09:00-17:00')) {
      return { label: 'Z4', color: '#009688' };
    }
    if (notes.includes('08:00-16:00')) {
      return { label: 'Z5', color: '#FF5722' };
    }
    if (notes.includes('13:00-21:00')) {
      return { label: 'Z6', color: '#673AB7' };
    }
    if (notes.includes('22:00-06:00')) {
      return { label: 'N8', color: '#E91E63' };
    }
    return { label: '-', color: '#9E9E9E' };
  };

  return (
    <Box sx={{ width: '100%', p: { xs: 1, sm: 2, md: 3 } }}>
      <Stack spacing={2}>
        {/* Header */}
        <Stack direction="row" alignItems="center" spacing={{ xs: 1, sm: 2 }} flexWrap="wrap">
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/schedules')}
            variant="outlined"
            size="small"
          >
            Inapoi
          </Button>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant={isMobile ? 'h6' : 'h5'} noWrap>Creare Program de Lucru</Typography>
            <Typography variant="caption" color="text.secondary" noWrap>
              Creeaza programul lunar pentru un user sau manager
            </Typography>
          </Box>
        </Stack>

        {/* Success/Error Alerts */}
        {successMessage && (
          <Alert severity="success" onClose={() => setSuccessMessage(null)} sx={{ width: '100%' }}>
            {successMessage}
          </Alert>
        )}
        {errorMessage && (
          <Alert severity="error" onClose={() => setErrorMessage(null)} sx={{ width: '100%' }}>
            {errorMessage}
          </Alert>
        )}

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ width: '100%' }}>
            Eroare la crearea programului. Incercati din nou.
          </Alert>
        )}

        {/* Info despre permisiuni */}
        {isManager && !isAdmin && (
          <Alert severity="info" sx={{ width: '100%' }}>
            Ca <strong>Manager</strong>, poti crea programe pentru angajati. Acestea vor trebui <strong>aprobate de un administrator</strong> inainte de a fi active.
          </Alert>
        )}
        {isAdmin && (
          <Alert severity="success" sx={{ width: '100%' }}>
            Ca <strong>Administrator</strong>, programele create vor fi <strong>aprobate automat</strong>.
          </Alert>
        )}

        {/* Selectori - User, Tip Tura, Luna */}
        <Card sx={{ width: '100%' }}>
          <CardContent sx={{ p: { xs: 1.5, sm: 2 }, '&:last-child': { pb: { xs: 1.5, sm: 2 } } }}>
            <Box sx={{
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              gap: 2,
              alignItems: { xs: 'stretch', md: 'center' },
            }}>
              {/* Selector User */}
              <Box sx={{ flex: 1, minWidth: { md: 200 } }}>
                <FormControl fullWidth size="small">
                  <InputLabel>User / Manager</InputLabel>
                  <Select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    label="User / Manager"
                    disabled={usersLoading}
                  >
                    {eligibleUsers.map((user) => (
                      <MenuItem key={user.id} value={user.id}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Chip
                            label={user.role === 'MANAGER' ? 'M' : 'A'}
                            size="small"
                            color={user.role === 'MANAGER' ? 'primary' : 'default'}
                            sx={{ minWidth: 24, height: 20, fontSize: '0.7rem' }}
                          />
                          <Typography variant="body2">{user.fullName}</Typography>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              {/* Selector Tip Tura */}
              <Box sx={{ flex: 1, minWidth: { md: 150 } }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Tip Tura</InputLabel>
                  <Select
                    value={shiftPattern}
                    onChange={(e) => {
                      const newPattern = e.target.value as ShiftPatternType;
                      // Doar schimba pattern-ul, nu sterge asignarile
                      // Asignarile incompatibile vor fi convertite sau ignorate la salvare
                      if (Object.keys(assignments).length > 0) {
                        // Avertizeaza utilizatorul ca are asignari care vor fi sterse
                        if (window.confirm('Schimbarea tipului de tura va sterge asignarile curente. Continuati?')) {
                          setShiftPattern(newPattern);
                          setAssignments({});
                        }
                      } else {
                        setShiftPattern(newPattern);
                      }
                    }}
                    label="Tip Tura"
                  >
                    <MenuItem value="12H">Tura 12 ore</MenuItem>
                    <MenuItem value="8H">Tura 8 ore</MenuItem>
                  </Select>
                </FormControl>
              </Box>

              {/* Selector Luna */}
              <Box sx={{ flex: 1, minWidth: { md: 180 } }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Luna</InputLabel>
                  <Select
                    value={monthYear}
                    onChange={(e) => {
                      const newMonth = e.target.value;
                      // Doar schimba luna, reseteaza asignarile pentru noua luna
                      if (Object.keys(assignments).length > 0) {
                        if (window.confirm('Schimbarea lunii va sterge asignarile curente. Continuati?')) {
                          setMonthYear(newMonth);
                          setAssignments({});
                          setLoadedKey(null); // Permite reincarcarea pentru luna noua
                        }
                      } else {
                        setMonthYear(newMonth);
                        setLoadedKey(null); // Permite reincarcarea pentru luna noua
                      }
                    }}
                    label="Luna"
                  >
                    {monthOptions.map(({ value, label }) => (
                      <MenuItem key={value} value={value}>
                        {label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* Legenda Ture */}
        <Paper sx={{ p: 1.5, width: '100%' }}>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
            <Typography variant="caption" fontWeight="bold" sx={{ mr: 1 }}>
              Legenda ({shiftPattern}):
            </Typography>
            {shiftOptions.map((option) => (
              <Chip
                key={option.id}
                label={`${option.shortLabel} - ${option.label}`}
                size="small"
                sx={{
                  bgcolor: option.color,
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: '0.7rem',
                  height: 24,
                }}
              />
            ))}
            <Chip
              label="L - Liber"
              variant="outlined"
              size="small"
              sx={{ fontSize: '0.7rem', height: 24 }}
            />
          </Stack>
          {shiftPattern === '12H' && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              * Dupa tura de zi (Z) - 24h liber | Dupa tura de noapte (N) - 48h liber
            </Typography>
          )}
          {/* Legenda pozitii de lucru */}
          {dbWorkPositions.length > 0 && (
            <Box sx={{ mt: 1.5, pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
                <Typography variant="caption" fontWeight="bold" sx={{ mr: 1 }}>
                  Pozitie lucru:
                </Typography>
                {filteredWorkPositions.map((position) => (
                  <Chip
                    key={position.id}
                    label={`${position.shortName} - ${position.name}`}
                    size="small"
                    sx={{
                      bgcolor: position.color,
                      color: 'white',
                      fontWeight: 'bold',
                      fontSize: '0.7rem',
                      height: 24,
                    }}
                  />
                ))}
              </Stack>
            </Box>
          )}
        </Paper>

        {/* Tabel Calendar */}
        {selectedUserId ? (
          <Card sx={{ width: '100%', overflow: 'auto' }}>
            <CardContent sx={{ p: { xs: 1, sm: 2 }, '&:last-child': { pb: { xs: 1, sm: 2 } } }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="subtitle1" fontWeight="bold">
                  Program {new Date(`${monthYear}-01`).toLocaleDateString('ro-RO', { month: 'long', year: 'numeric' })}
                </Typography>
                <Tooltip title="Sterge toate selectiile">
                  <IconButton onClick={handleClearAll} color="error" size="small">
                    <ClearIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Stack>

              {/* Calendar Grid - scrollable on mobile */}
              <Box sx={{
                overflowX: { xs: 'auto', md: 'visible' },
                pb: { xs: 1, md: 0 },
                '&::-webkit-scrollbar': { height: 6 },
                '&::-webkit-scrollbar-thumb': { bgcolor: 'grey.400', borderRadius: 3 },
              }}>
                <Box sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: 'repeat(7, minmax(48px, 1fr))',
                    sm: 'repeat(7, 1fr)',
                  },
                  gap: { xs: 0.25, sm: 0.5 },
                  minWidth: { xs: 340, sm: 'auto' },
                }}>
                  {calendarDays.map(({ day, date, dayOfWeek, isWeekend }) => (
                    <Paper
                      key={date}
                      elevation={1}
                      sx={{
                        p: { xs: 0.25, sm: 0.5 },
                        textAlign: 'center',
                        bgcolor: isWeekend ? 'grey.100' : 'background.paper',
                        border: assignments[date] ? `2px solid ${getDayColor(date)}` : '1px solid',
                        borderColor: assignments[date] ? getDayColor(date) : 'divider',
                        borderRadius: 1,
                        minHeight: { xs: 60, sm: 85 },
                        display: 'flex',
                        flexDirection: 'column',
                      }}
                    >
                    {/* Header zi */}
                    <Box sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      mb: { xs: 0.25, sm: 0.5 },
                    }}>
                      <Typography
                        variant="caption"
                        sx={{
                          fontWeight: 'bold',
                          fontSize: { xs: '0.5rem', sm: '0.6rem' },
                          color: isWeekend ? 'error.main' : 'text.secondary',
                        }}
                      >
                        {dayOfWeek}
                      </Typography>
                      <Typography
                        sx={{
                          fontWeight: 'bold',
                          bgcolor: isWeekend ? 'error.light' : 'primary.light',
                          color: 'white',
                          borderRadius: '50%',
                          width: { xs: 16, sm: 18 },
                          height: { xs: 16, sm: 18 },
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: { xs: '0.55rem', sm: '0.65rem' },
                        }}
                      >
                        {day}
                      </Typography>
                    </Box>

                    {/* Selector tura */}
                    <FormControl fullWidth size="small" sx={{ mb: { xs: 0.25, sm: 0.5 } }}>
                      <Select
                        value={assignments[date] || ''}
                        onChange={(e) => handleDayShiftChange(date, e.target.value)}
                        displayEmpty
                        sx={{
                          fontSize: { xs: '0.55rem', sm: '0.65rem' },
                          '& .MuiSelect-select': {
                            py: { xs: 0.2, sm: 0.3 },
                            px: { xs: 0.25, sm: 0.5 },
                            bgcolor: getDayColor(date),
                            color: assignments[date] ? 'white' : 'inherit',
                            fontWeight: assignments[date] ? 'bold' : 'normal',
                            minHeight: 'unset !important',
                          },
                          '& .MuiOutlinedInput-notchedOutline': {
                            borderWidth: 1,
                          },
                        }}
                      >
                        <MenuItem value="" sx={{ fontSize: '0.75rem' }}>
                          <em>Liber</em>
                        </MenuItem>
                        {shiftOptions.map((option) => (
                          <MenuItem
                            key={option.id}
                            value={option.id}
                            sx={{
                              fontSize: '0.75rem',
                              bgcolor: option.color,
                              color: 'white',
                              '&:hover': { bgcolor: option.color, opacity: 0.9 },
                              '&.Mui-selected': { bgcolor: option.color, '&:hover': { bgcolor: option.color } },
                            }}
                          >
                            {option.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    {/* Selector pozitie de lucru - doar daca exista o tura asignata */}
                    {assignments[date] && dbWorkPositions.length > 0 && (
                      <FormControl fullWidth size="small">
                        <Select
                          value={workPositions[date] || filteredWorkPositions[0]?.id || ''}
                          onChange={(e) => handleWorkPositionChange(date, e.target.value)}
                          sx={{
                            fontSize: { xs: '0.5rem', sm: '0.6rem' },
                            '& .MuiSelect-select': {
                              py: { xs: 0.15, sm: 0.2 },
                              px: { xs: 0.25, sm: 0.5 },
                              bgcolor: (filteredWorkPositions.find(p => p.id === (workPositions[date] || filteredWorkPositions[0]?.id)) || dbWorkPositions.find(p => p.id === workPositions[date]))?.color || '#2196F3',
                              color: 'white',
                              fontWeight: 'bold',
                              minHeight: 'unset !important',
                            },
                            '& .MuiOutlinedInput-notchedOutline': {
                              borderWidth: 1,
                            },
                          }}
                        >
                          {filteredWorkPositions.map((position) => (
                            <MenuItem
                              key={position.id}
                              value={position.id}
                              sx={{
                                fontSize: '0.7rem',
                                bgcolor: position.color,
                                color: 'white',
                                '&:hover': { bgcolor: position.color, opacity: 0.9 },
                                '&.Mui-selected': { bgcolor: position.color, '&:hover': { bgcolor: position.color } },
                              }}
                            >
                              {position.shortName}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    )}
                  </Paper>
                  ))}
                </Box>
              </Box>
            </CardContent>
          </Card>
        ) : (
          <Alert severity="info" sx={{ width: '100%' }}>
            Selecteaza un user sau manager pentru a crea programul de lucru.
          </Alert>
        )}

        {/* Sumar si butoane */}
        {selectedUserId && (
          <Card sx={{ width: '100%' }}>
            <CardContent sx={{ p: { xs: 1.5, sm: 2 }, '&:last-child': { pb: { xs: 1.5, sm: 2 } } }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} spacing={1}>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="body2" noWrap sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                    <strong>{Object.keys(assignments).length}</strong> zile asignate din <strong>{daysInMonth}</strong> |
                    User: <strong>{eligibleUsers.find(u => u.id === selectedUserId)?.fullName}</strong>
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Button variant="outlined" size="small" onClick={() => navigate('/schedules')}>
                    Anuleaza
                  </Button>
                  {isAdmin ? (
                    // Admin - salveaza si aproba direct
                    <Button
                      variant="contained"
                      size="small"
                      color="success"
                      startIcon={(creating || updating) ? <CircularProgress size={16} /> : <SaveIcon />}
                      onClick={handleSave}
                      disabled={creating || updating || Object.keys(assignments).length === 0}
                    >
                      {(creating || updating) ? 'Salvare...' : 'Salveaza si Aproba'}
                    </Button>
                  ) : (
                    // Manager - salveaza ca draft sau trimite pentru aprobare
                    <>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={(creating || updating) ? <CircularProgress size={16} /> : <SaveIcon />}
                        onClick={handleSave}
                        disabled={creating || updating || Object.keys(assignments).length === 0}
                      >
                        Salveaza Draft
                      </Button>
                      <Button
                        variant="contained"
                        size="small"
                        color="primary"
                        startIcon={(creating || updating) ? <CircularProgress size={16} /> : <SendIcon />}
                        onClick={handleSaveAndSubmit}
                        disabled={creating || updating || Object.keys(assignments).length === 0}
                      >
                        Trimite pentru Aprobare
                      </Button>
                    </>
                  )}
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        )}

        {/* Sectiunea cu toti angajatii si programele lor */}
        <Divider sx={{ my: 1 }} />

        <Card sx={{ width: '100%' }}>
          <CardContent sx={{ p: { xs: 1, sm: 2 }, '&:last-child': { pb: { xs: 1, sm: 2 } } }}>
            <Stack direction="row" alignItems="center" spacing={1} mb={2} sx={{ minWidth: 0 }}>
              <GroupIcon color="primary" sx={{ flexShrink: 0 }} />
              <Typography variant="subtitle1" fontWeight="bold" noWrap sx={{ fontSize: { xs: '0.85rem', sm: '1rem' } }}>
                Programele Tuturor Angajatilor - {new Date(`${monthYear}-01`).toLocaleDateString('ro-RO', { month: 'long', year: 'numeric' })}
              </Typography>
            </Stack>

            <TableContainer sx={{ maxHeight: 400, overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell
                      sx={{
                        position: 'sticky',
                        left: 0,
                        bgcolor: 'background.paper',
                        zIndex: 3,
                        minWidth: 120,
                        fontWeight: 'bold',
                        fontSize: '0.75rem',
                      }}
                    >
                      User
                    </TableCell>
                    {calendarDays.map(({ day, dayOfWeek, isWeekend }) => (
                      <TableCell
                        key={day}
                        align="center"
                        sx={{
                          p: 0.3,
                          minWidth: 30,
                          maxWidth: 35,
                          bgcolor: isWeekend ? 'grey.200' : 'background.paper',
                          fontWeight: 'bold',
                          fontSize: '0.65rem',
                        }}
                      >
                        <Box>
                          <Typography sx={{ fontSize: '0.6rem', color: isWeekend ? 'error.main' : 'text.secondary' }}>
                            {dayOfWeek}
                          </Typography>
                          <Typography sx={{ fontSize: '0.7rem', fontWeight: 'bold' }}>
                            {day}
                          </Typography>
                        </Box>
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {eligibleUsers.map((user) => {
                    const userAssignments = allUsersAssignments[user.id] || {};
                    const isCurrentUser = user.id === selectedUserId;

                    return (
                      <TableRow
                        key={user.id}
                        sx={{
                          bgcolor: isCurrentUser ? 'primary.light' : 'inherit',
                          '&:hover': { bgcolor: isCurrentUser ? 'primary.light' : 'action.hover' },
                        }}
                      >
                        <TableCell
                          sx={{
                            position: 'sticky',
                            left: 0,
                            bgcolor: isCurrentUser ? 'primary.light' : 'background.paper',
                            zIndex: 1,
                            p: 0.5,
                          }}
                        >
                          <Stack direction="row" alignItems="center" spacing={0.5}>
                            <Avatar sx={{ width: 24, height: 24, fontSize: '0.7rem' }}>
                              {user.fullName.charAt(0)}
                            </Avatar>
                            <Box>
                              <Typography variant="caption" fontWeight={isCurrentUser ? 'bold' : 'normal'} sx={{ fontSize: '0.7rem' }}>
                                {user.fullName}
                              </Typography>
                              <Chip
                                label={user.role === 'MANAGER' ? 'M' : 'A'}
                                size="small"
                                color={user.role === 'MANAGER' ? 'primary' : 'default'}
                                sx={{ ml: 0.5, height: 14, fontSize: '0.6rem', '& .MuiChip-label': { px: 0.5 } }}
                              />
                            </Box>
                          </Stack>
                        </TableCell>
                        {calendarDays.map(({ date, isWeekend }) => {
                          // Pentru utilizatorul curent, arata asignarile din state
                          // Pentru alti utilizatori, arata asignarile din baza de date
                          const currentUserShift = isCurrentUser ? assignments[date] : null;
                          const existingAssignment = userAssignments[date];

                          let cellContent = null;
                          let cellBgColor = isWeekend ? 'grey.100' : 'transparent';

                          if (isCurrentUser && currentUserShift) {
                            const shift = shiftOptions.find(s => s.id === currentUserShift);
                            if (shift) {
                              cellContent = shift.shortLabel;
                              cellBgColor = shift.color;
                            }
                          } else if (existingAssignment) {
                            const shiftInfo = getExistingShiftInfo(existingAssignment.notes);
                            cellContent = shiftInfo.label;
                            cellBgColor = shiftInfo.color;
                          }

                          return (
                            <TableCell
                              key={date}
                              align="center"
                              sx={{
                                p: 0.2,
                                bgcolor: cellBgColor,
                                color: cellContent ? 'white' : 'inherit',
                                fontWeight: 'bold',
                                fontSize: '0.65rem',
                                border: '1px solid',
                                borderColor: 'divider',
                              }}
                            >
                              {cellContent || '-'}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>

            {eligibleUsers.length === 0 && (
              <Alert severity="info" sx={{ mt: 2 }}>
                Nu exista angajati sau manageri activi.
              </Alert>
            )}
          </CardContent>
        </Card>
      </Stack>
    </Box>
  );
};

export default CreateSchedulePage;
