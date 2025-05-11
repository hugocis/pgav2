'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import DashboardContainer from '@/components/DashboardContainer';
import {
  FaArrowLeft,
  FaPen,
  FaSearch,
  FaFilter,
  FaEye,
  FaCheck,
  FaTimes,
  FaChalkboardTeacher,
  FaCalendarAlt,
  FaFileSignature,
  FaBook,
  FaSortAmountDown,
  FaSortAmountUp,
  FaBan,
  FaChevronDown,
  FaHome,
  FaTachometerAlt
} from 'react-icons/fa';


// Interfaces para el tipado
interface TeacherSignature {
  id: string;
  teacherId: string;
  teacherName: string;
  departmentId: string;
  department: string;
  subjectCode: string;
  subject: string;
  signatureDate: string;
  sessionDate: string;
  sessionType: string;
  status: string;
  verifiedDate: string | null;
  verifiedBy: string | null;
  comments: string | null;
}

interface Filter {
  status: string;
  dateFrom: string;
  dateTo: string;
  department: string;
  subjectCode: string;
  searchTerm: string;
}

export default function TeacherSignatures() {
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      redirect('/login');
    }
  });

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signatures, setSignatures] = useState<TeacherSignature[]>([]);
  const [filteredSignatures, setFilteredSignatures] = useState<TeacherSignature[]>([]);
  const [selectedSignature, setSelectedSignature] = useState<TeacherSignature | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  
  const [departments, setDepartments] = useState(['Todos', 'Ingeniería', 'Ciencias', 'Humanidades', 'Derecho', 'Medicina']);
  
  const [filter, setFilter] = useState<Filter>({
    status: 'all',
    dateFrom: '',
    dateTo: '',
    department: 'Todos',
    subjectCode: '',
    searchTerm: ''
  });
  
  const [verification, setVerification] = useState({
    status: '',
    comments: ''
  });
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Construir parámetros de consulta basados en los filtros
        const queryParams = new URLSearchParams();
        if (filter.status !== 'all') queryParams.append('status', filter.status);
        if (filter.dateFrom) queryParams.append('dateFrom', filter.dateFrom);
        if (filter.dateTo) queryParams.append('dateTo', filter.dateTo);
        if (filter.department !== 'Todos') queryParams.append('department', filter.department);
        if (filter.subjectCode) queryParams.append('subjectCode', filter.subjectCode);
        if (filter.searchTerm) queryParams.append('searchTerm', filter.searchTerm);
          // Hacer la llamada a la API con los filtros aplicados
        const response = await fetch(`/api/firmas-docente?${queryParams.toString()}`, {
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error(`Error al obtener datos: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        setSignatures(data);
        setFilteredSignatures(data);
        setError(null);
      } catch (error) {
        console.error('Error al cargar las firmas de docentes:', error);
        setError('No se pudieron cargar las firmas de docentes. Por favor, intente nuevamente más tarde.');
        
        // Como fallback, usamos datos de ejemplo si la API falla
        const mockSignatures: TeacherSignature[] = [
          {
            id: '1',
            teacherId: 'PROF001',
            teacherName: 'Dr. Antonio García López',
            departmentId: 'DEP01',
            department: 'Ingeniería',
            subjectCode: 'ING101',
            subject: 'Fundamentos de Ingeniería',
            signatureDate: '2025-05-10',
            sessionDate: '2025-05-10',
            sessionType: 'Clase magistral',
            status: 'pending',
            verifiedDate: null,
            verifiedBy: null,
            comments: null
          },
          {
            id: '2',
            teacherId: 'PROF015',
            teacherName: 'Dra. María Rodríguez Sánchez',
            departmentId: 'DEP02',
            department: 'Ciencias',
            subjectCode: 'BIO202',
            subject: 'Biología Molecular',
            signatureDate: '2025-05-09',
            sessionDate: '2025-05-09',
            sessionType: 'Laboratorio',
            status: 'verified',
            verifiedDate: '2025-05-10',
            verifiedBy: 'Javier Moreno (Manager)',
            comments: 'Verificada correctamente'
          },
          {
            id: '3',
            teacherId: 'PROF023',
            teacherName: 'Dr. Carlos Martínez Gómez',
            departmentId: 'DEP03',
            department: 'Humanidades',
            subjectCode: 'HIS304',
            subject: 'Historia Contemporánea',
            signatureDate: '2025-05-08',
            sessionDate: '2025-05-08',
            sessionType: 'Seminario',
            status: 'rejected',
            verifiedDate: '2025-05-09',
            verifiedBy: 'Luisa Fernández (Manager)',
            comments: 'Horario inconsistente con la programación académica'
          },
          {
            id: '4',
            teacherId: 'PROF045',
            teacherName: 'Dra. Laura Sánchez Fernández',
            departmentId: 'DEP04',
            department: 'Derecho',
            subjectCode: 'DER101',
            subject: 'Introducción al Derecho',
            signatureDate: '2025-05-07',
            sessionDate: '2025-05-07',
            sessionType: 'Clase magistral',
            status: 'pending',
            verifiedDate: null,
            verifiedBy: null,
            comments: null
          },
          {
            id: '5',
            teacherId: 'PROF052',
            teacherName: 'Dr. Pedro López Ruiz',
            departmentId: 'DEP05',
            department: 'Medicina',
            subjectCode: 'MED203',
            subject: 'Anatomía Humana II',
            signatureDate: '2025-05-06',
            sessionDate: '2025-05-06',
            sessionType: 'Práctica clínica',
            status: 'verified',
            verifiedDate: '2025-05-07',
            verifiedBy: 'Ana Martínez (Manager)',
            comments: 'Verificada correctamente'
          }
        ];
        
        setSignatures(mockSignatures);
        setFilteredSignatures(mockSignatures);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [filter]);

  useEffect(() => {
    // Aplicar filtros cuando cambien
    let result = [...signatures];
    
    // Filtrar por estado
    if (filter.status !== 'all') {
      result = result.filter(sig => sig.status === filter.status);
    }
    
    // Filtrar por fecha (desde)
    if (filter.dateFrom) {
      result = result.filter(sig => new Date(sig.sessionDate) >= new Date(filter.dateFrom));
    }
    
    // Filtrar por fecha (hasta)
    if (filter.dateTo) {
      result = result.filter(sig => new Date(sig.sessionDate) <= new Date(filter.dateTo));
    }
    
    // Filtrar por departamento
    if (filter.department !== 'Todos') {
      result = result.filter(sig => sig.department === filter.department);
    }
    
    // Filtrar por código de asignatura
    if (filter.subjectCode) {
      result = result.filter(sig => 
        sig.subjectCode.toLowerCase().includes(filter.subjectCode.toLowerCase()) ||
        sig.subject.toLowerCase().includes(filter.subjectCode.toLowerCase())
      );
    }
    
    // Filtrar por término de búsqueda
    if (filter.searchTerm) {
      const term = filter.searchTerm.toLowerCase();
      result = result.filter(sig => 
        sig.teacherName.toLowerCase().includes(term) ||
        sig.teacherId.toLowerCase().includes(term) ||
        sig.subject.toLowerCase().includes(term) ||
        sig.sessionType.toLowerCase().includes(term)
      );
    }
    
    setFilteredSignatures(result);
  }, [filter, signatures]);
  
  const viewSignatureDetails = (signature: TeacherSignature) => {
    setSelectedSignature(signature);
    setShowDetailModal(true);
    setVerification({
      status: signature.status,
      comments: signature.comments || ''
    });
  };
  
  const handleFilterChange = (key: keyof Filter, value: string) => {
    setFilter(prev => ({
      ...prev,
      [key]: value
    }));
  };
  
  const resetFilters = () => {
    setFilter({
      status: 'all',
      dateFrom: '',
      dateTo: '',
      department: 'Todos',
      subjectCode: '',
      searchTerm: ''
    });
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'verified':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'pending':
      default:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'verified':
        return 'Verificada';
      case 'rejected':
        return 'Rechazada';
      case 'pending':
      default:
        return 'Pendiente';
    }
  };
    const handleVerify = async () => {
    if (!selectedSignature) return;
    
    try {      // Llamada a la API para actualizar el estado de la firma
      const response = await fetch('/api/firmas-docente', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: selectedSignature.id,
          status: verification.status,
          comments: verification.comments,
        }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Error al verificar la firma: ${response.status} ${response.statusText}`);
      }
      
      // Actualizamos el estado local tras la respuesta exitosa
      const updatedSignatures = signatures.map(sig => {
        if (sig.id === selectedSignature.id) {
          return {
            ...sig,
            status: verification.status,
            comments: verification.comments,
            verifiedDate: new Date().toISOString().split('T')[0],
            verifiedBy: session?.user?.name || 'Manager'
          };
        }
        return sig;
      });
      
      setSignatures(updatedSignatures);
      setShowDetailModal(false);
      setSelectedSignature(null);
    } catch (error) {
      console.error('Error al verificar la firma:', error);
      alert('Error al verificar la firma. Por favor, inténtelo de nuevo.');
    }
  };
  
  return (
    <DashboardContainer roleName="Manager">
      <div>
        {/* Component content would go here */}
        {/* This is a placeholder to complete the component structure */}
      </div>
    </DashboardContainer>
  );
}
