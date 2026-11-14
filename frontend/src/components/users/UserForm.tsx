import React, { useEffect, useState } from 'react';
import {
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Stack,
  FormHelperText,
  CircularProgress,
  OutlinedInput,
  Checkbox,
  ListItemText,
  FormControlLabel,
  Switch,
  Box,
} from '@mui/material';
import { useGetDepartmentsQuery } from '../../store/api/departmentsApi';
import type { CreateUserRequest, UpdateUserRequest } from '../../store/api/users.api';
import DatePickerField from '../common/DatePickerField';
import { removeDiacritics } from '../../utils/removeDiacritics';

const AUTO_SCHEDULE_OPTIONS = [
  { start: '06:00', label: '06:00 - 14:00' },
  { start: '07:30', label: '07:30 - 15:30' },
  { start: '08:00', label: '08:00 - 16:00' },
  { start: '09:00', label: '09:00 - 17:00' },
  { start: '13:00', label: '13:00 - 21:00' },
  { start: '14:00', label: '14:00 - 22:00' },
];

interface UserFormProps {
  initialData?: Partial<CreateUserRequest & UpdateUserRequest & { id: string }>;
  onSubmit: (data: CreateUserRequest | UpdateUserRequest) => void;
  onCancel: () => void;
  isCreate?: boolean;
  isLoading?: boolean;
  currentUserRole?: string;
  isEditingMasterAdmin?: boolean;
}

export const UserForm: React.FC<UserFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  isCreate = false,
  isLoading = false,
  currentUserRole,
  isEditingMasterAdmin = false,
}) => {
  const { data: departments, isLoading: departmentsLoading } = useGetDepartmentsQuery();

  const [formData, setFormData] = useState({
    email: initialData?.email || '',
    password: '',
    fullName: initialData?.fullName || '',
    phone: initialData?.phone || '',
    role: (initialData?.role || 'USER') as string,
    departmentId: initialData?.departmentId || '',
    birthDate: initialData?.birthDate || '',
    hrVisibleDepartmentIds: initialData?.hrVisibleDepartmentIds || [],
    hrOnlyDispPosition: initialData?.hrOnlyDispPosition || false,
    managerDepartmentIds: (initialData?.managerDepartmentIds || []) as string[],
    managerAllDepartments: !(initialData?.managerDepartmentIds?.length),
    autoScheduleStart: initialData?.autoScheduleStart || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialData) {
      setFormData({
        email: initialData.email || '',
        password: '',
        fullName: initialData.fullName || '',
        phone: initialData.phone || '',
        role: initialData.role || 'USER',
        departmentId: initialData.departmentId || '',
        birthDate: initialData.birthDate || '',
        hrVisibleDepartmentIds: initialData.hrVisibleDepartmentIds || [],
        hrOnlyDispPosition: initialData.hrOnlyDispPosition || false,
        managerDepartmentIds: initialData.managerDepartmentIds || [],
        managerAllDepartments: !initialData.managerDepartmentIds?.length,
        autoScheduleStart: initialData.autoScheduleStart || '',
      });
    }
  }, [initialData]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.email) {
      newErrors.email = 'Email-ul este obligatoriu';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email invalid';
    }

    if (isCreate) {
      if (!formData.password) {
        newErrors.password = 'Parola este obligatorie';
      } else if (formData.password.length < 6) {
        newErrors.password = 'Minim 6 caractere';
      } else if (!/^(?=.*[A-Z])(?=.*[0-9])/.test(formData.password)) {
        newErrors.password = 'Parola trebuie sa contina cel putin o majuscula si o cifra';
      }

      if (!formData.fullName) {
        newErrors.fullName = 'Numele complet este obligatoriu';
      }
    }

    if (!formData.role) {
      newErrors.role = 'Rolul este obligatoriu';
    }

    if (
      formData.role === 'MANAGER' &&
      !formData.managerAllDepartments &&
      formData.managerDepartmentIds.length === 0
    ) {
      newErrors.managerDepartmentIds = 'Alege cel putin un departament';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const cleanedData: any = {};

    Object.entries(formData).forEach(([key, value]) => {
      if (key === 'password' && !isCreate) {
        // Skip password for update
        return;
      }
      // Campurile HR se trimit separat, doar pentru rolul RESURSE_UMANE
      if (
        key === 'hrVisibleDepartmentIds' ||
        key === 'hrOnlyDispPosition' ||
        key === 'managerDepartmentIds' ||
        key === 'managerAllDepartments' ||
        key === 'autoScheduleStart'
      ) {
        return;
      }
      if (value !== '' && value !== null && value !== undefined) {
        cleanedData[key] = value;
      }
    });

    // Scope-ul HR se salveaza doar cand rolul e Resurse Umane
    if (formData.role === 'RESURSE_UMANE') {
      cleanedData.hrVisibleDepartmentIds = formData.hrVisibleDepartmentIds;
      cleanedData.hrOnlyDispPosition = formData.hrOnlyDispPosition;
    }

    // Program fix automat (gol = fara program individual)
    if (
      (formData.role === 'USER' || formData.role === 'MANAGER') &&
      (currentUserRole === 'ADMIN' || currentUserRole === 'MASTER_ADMIN')
    ) {
      cleanedData.autoScheduleStart = formData.autoScheduleStart || null;
    }

    // Departamentele alocate managerului (null = toate departamentele)
    if (formData.role === 'MANAGER') {
      cleanedData.managerDepartmentIds = formData.managerAllDepartments
        ? null
        : formData.managerDepartmentIds;
    }

    onSubmit(cleanedData);
  };

  const handleChange = (field: string) => (
    e: React.ChangeEvent<HTMLInputElement | { value: unknown }>
  ) => {
    const value = field === 'fullName' ? removeDiacritics(e.target.value as string) : e.target.value as string;
    setFormData({ ...formData, [field]: value });
    if (errors[field]) {
      setErrors({ ...errors, [field]: '' });
    }
  };

  if (departmentsLoading) {
    return (
      <Stack alignItems="center" justifyContent="center" sx={{ py: 4 }}>
        <CircularProgress />
      </Stack>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <Stack spacing={3}>
        <TextField
          label="Email"
          type="email"
          value={formData.email}
          onChange={handleChange('email')}
          error={!!errors.email}
          helperText={errors.email}
          fullWidth
          required={isCreate}
        />

        {isCreate && (
          <TextField
            label="Parola"
            type="password"
            value={formData.password}
            onChange={handleChange('password')}
            error={!!errors.password}
            helperText={errors.password}
            fullWidth
            required
          />
        )}

        <TextField
          label="Nume Complet"
          value={formData.fullName}
          onChange={handleChange('fullName')}
          error={!!errors.fullName}
          helperText={errors.fullName}
          fullWidth
          required={isCreate}
        />

        <TextField
          label="Telefon"
          value={formData.phone}
          onChange={handleChange('phone')}
          error={!!errors.phone}
          helperText={errors.phone}
          fullWidth
          type="tel"
          inputProps={{ inputMode: 'tel' }}
        />

        <DatePickerField
          label="Data Nasterii"
          value={formData.birthDate || null}
          onChange={(value) => {
            setFormData({ ...formData, birthDate: value || '' });
            if (errors.birthDate) {
              setErrors({ ...errors, birthDate: '' });
            }
          }}
          error={!!errors.birthDate}
          helperText={errors.birthDate || 'Necesara pentru concediul de zi de nastere'}
          fullWidth
          isBirthDate
        />

        <FormControl fullWidth error={!!errors.role} required={isCreate} disabled={isEditingMasterAdmin}>
          <InputLabel>Rol</InputLabel>
          <Select
            value={formData.role}
            onChange={handleChange('role') as any}
            label="Rol"
          >
            {currentUserRole === 'MASTER_ADMIN' && (
              <MenuItem value="ADMIN">Administrator</MenuItem>
            )}
            <MenuItem value="MANAGER">Manager</MenuItem>
            <MenuItem value="USER">User</MenuItem>
            {currentUserRole === 'MASTER_ADMIN' && (
              <MenuItem value="RESURSE_UMANE">Resurse Umane</MenuItem>
            )}
          </Select>
          {errors.role && <FormHelperText>{errors.role}</FormHelperText>}
          {isEditingMasterAdmin && <FormHelperText>Rolul Master Admin nu poate fi schimbat</FormHelperText>}
        </FormControl>

        {/* Configurare scope pentru Resurse Umane (doar Master Admin) */}
        {formData.role === 'RESURSE_UMANE' && currentUserRole === 'MASTER_ADMIN' && (
          <>
            <FormControl fullWidth>
              <InputLabel>Departamente vizibile (HR)</InputLabel>
              <Select
                multiple
                value={formData.hrVisibleDepartmentIds}
                onChange={(e) => setFormData({ ...formData, hrVisibleDepartmentIds: e.target.value as string[] })}
                input={<OutlinedInput label="Departamente vizibile (HR)" />}
                renderValue={(selected) =>
                  (selected as string[])
                    .map((id) => departments?.find((d) => d.id === id)?.name || id)
                    .join(', ')
                }
              >
                {departments?.map((dept) => (
                  <MenuItem key={dept.id} value={dept.id}>
                    <Checkbox checked={formData.hrVisibleDepartmentIds.includes(dept.id)} />
                    <ListItemText primary={dept.name} />
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>Din ce departamente vede userul HR programele (pontajul)</FormHelperText>
            </FormControl>

            <FormControlLabel
              control={
                <Switch
                  checked={formData.hrOnlyDispPosition}
                  onChange={(e) => setFormData({ ...formData, hrOnlyDispPosition: e.target.checked })}
                />
              }
              label="Doar turele de Dispecerat (pozitia DISP)"
            />
          </>
        )}

        {/* Program fix automat in fiecare luna */}
        {(formData.role === 'USER' || formData.role === 'MANAGER') &&
          (currentUserRole === 'ADMIN' || currentUserRole === 'MASTER_ADMIN') && (
          <FormControl fullWidth>
            <InputLabel>Program fix automat</InputLabel>
            <Select
              value={formData.autoScheduleStart}
              label="Program fix automat"
              onChange={(e) => setFormData({ ...formData, autoScheduleStart: e.target.value as string })}
            >
              <MenuItem value="">
                <em>Nu (sau dupa departament)</em>
              </MenuItem>
              {AUTO_SCHEDULE_OPTIONS.map((o) => (
                <MenuItem key={o.start} value={o.start}>
                  {o.label}
                </MenuItem>
              ))}
            </Select>
            <FormHelperText>
              Se completeaza singur in fiecare luna, in zilele lucratoare (fara sarbatori si concedii)
            </FormHelperText>
          </FormControl>
        )}

        {/* Departamentele pe care le gestioneaza managerul */}
        {formData.role === 'MANAGER' &&
          (currentUserRole === 'ADMIN' || currentUserRole === 'MASTER_ADMIN') && (
          <Box
            sx={{
              border: 1,
              borderColor: errors.managerDepartmentIds ? 'error.main' : 'divider',
              borderRadius: 2,
              p: 1.5,
              display: 'flex',
              flexDirection: 'column',
              gap: 1.5,
            }}
          >
            <FormControlLabel
              control={
                <Switch
                  checked={formData.managerAllDepartments}
                  onChange={(e) => {
                    setFormData({ ...formData, managerAllDepartments: e.target.checked });
                    if (errors.managerDepartmentIds) setErrors({ ...errors, managerDepartmentIds: '' });
                  }}
                />
              }
              label="Gestioneaza toate departamentele"
            />
            {!formData.managerAllDepartments && (
              <FormControl fullWidth error={!!errors.managerDepartmentIds}>
                <InputLabel>Departamente alocate</InputLabel>
                <Select
                  multiple
                  value={formData.managerDepartmentIds}
                  onChange={(e) => {
                    setFormData({ ...formData, managerDepartmentIds: e.target.value as string[] });
                    if (errors.managerDepartmentIds) setErrors({ ...errors, managerDepartmentIds: '' });
                  }}
                  input={<OutlinedInput label="Departamente alocate" />}
                  renderValue={(selected) =>
                    (selected as string[])
                      .map((id) => departments?.find((d) => d.id === id)?.name || id)
                      .join(', ')
                  }
                >
                  {departments?.map((dept) => (
                    <MenuItem key={dept.id} value={dept.id}>
                      <Checkbox checked={formData.managerDepartmentIds.includes(dept.id)} />
                      <ListItemText primary={dept.name} />
                    </MenuItem>
                  ))}
                </Select>
                <FormHelperText>
                  {errors.managerDepartmentIds ||
                    'Programe, concedii, rapoarte, pontaj, notificari si sarbatori doar pentru aceste departamente'}
                </FormHelperText>
              </FormControl>
            )}
          </Box>
        )}

        <FormControl fullWidth error={!!errors.departmentId}>
          <InputLabel>Departament</InputLabel>
          <Select
            value={formData.departmentId}
            onChange={handleChange('departmentId') as any}
            label="Departament"
          >
            <MenuItem value="">
              <em>Fara departament</em>
            </MenuItem>
            {departments?.map((dept) => (
              <MenuItem key={dept.id} value={dept.id}>
                {dept.name}
              </MenuItem>
            ))}
          </Select>
          {errors.departmentId && <FormHelperText>{errors.departmentId}</FormHelperText>}
        </FormControl>

        <Stack direction="row" spacing={2} justifyContent="flex-end">
          <Button onClick={onCancel} disabled={isLoading}>
            Anuleaza
          </Button>
          <Button type="submit" variant="contained" disabled={isLoading}>
            {isLoading ? <CircularProgress size={24} /> : isCreate ? 'Creeaza' : 'Salveaza'}
          </Button>
        </Stack>
      </Stack>
    </form>
  );
};
