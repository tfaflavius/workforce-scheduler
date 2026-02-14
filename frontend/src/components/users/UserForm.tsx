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
} from '@mui/material';
import { useGetDepartmentsQuery } from '../../store/api/departmentsApi';
import type { CreateUserRequest, UpdateUserRequest } from '../../store/api/users.api';
import DatePickerField from '../common/DatePickerField';
import { removeDiacritics } from '../../utils/removeDiacritics';

interface UserFormProps {
  initialData?: Partial<CreateUserRequest & UpdateUserRequest & { id: string }>;
  onSubmit: (data: CreateUserRequest | UpdateUserRequest) => void;
  onCancel: () => void;
  isCreate?: boolean;
  isLoading?: boolean;
}

export const UserForm: React.FC<UserFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  isCreate = false,
  isLoading = false,
}) => {
  const { data: departments, isLoading: departmentsLoading } = useGetDepartmentsQuery();

  const [formData, setFormData] = useState({
    email: initialData?.email || '',
    password: '',
    fullName: initialData?.fullName || '',
    phone: initialData?.phone || '',
    role: initialData?.role || 'USER',
    departmentId: initialData?.departmentId || '',
    birthDate: initialData?.birthDate || '',
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
      if (value !== '' && value !== null && value !== undefined) {
        cleanedData[key] = value;
      }
    });

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

        <FormControl fullWidth error={!!errors.role} required={isCreate}>
          <InputLabel>Rol</InputLabel>
          <Select
            value={formData.role}
            onChange={handleChange('role') as any}
            label="Rol"
          >
            <MenuItem value="ADMIN">Administrator</MenuItem>
            <MenuItem value="MANAGER">Manager</MenuItem>
            <MenuItem value="USER">User</MenuItem>
          </Select>
          {errors.role && <FormHelperText>{errors.role}</FormHelperText>}
        </FormControl>

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
