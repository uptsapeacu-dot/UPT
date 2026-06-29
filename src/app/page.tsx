"use client";

import React, { useState, useEffect, useRef } from 'react';
import { sbClient } from '@/lib/supabase';
import { 
  Lock, Mail, KeyRound, User, Settings, LogOut, Plus, RefreshCw, 
  Check, Clock, Edit, Printer, Save, CheckCircle, Loader2, 
  ShieldCheck, X, Signature 
} from 'lucide-react';
import SignatureCanvas from '@/components/SignatureCanvas';

interface Ficha {
  id: string | number;
  nome: string;
  cpf: string;
  rg?: string;
  email?: string;
  telefone?: string;
  data_nascimento?: string;
  url_assinatura?: string;
  endereco?: string;
  formacao_academica?: string;
  cargo?: string;
  matricula?: string;
  data_admissao?: string;
  status_assinatura?: string;
}

export default function Home() {
  const [loadingInicial, setLoadingInicial] = useState(true);
  const [screen, setScreen] = useState<'login' | 'adm' | 'formulario' | 'captura-codigo' | 'canvas-aluno'>('login');
  const [usuarioLogado, setUsuarioLogado] = useState<any>(null);
  
  // Login
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [loadingAuth, setLoadingAuth] = useState(false);
  
  // Dashboard & Fichas
  const [fichas, setFichas] = useState<Ficha[]>([]);
  const [loadingFichas, setLoadingFichas] = useState(false);
  const [nomeDiretor, setNomeDiretor] = useState('Diretor');
  const [assinaturaDiretorGlobal, setAssinaturaDiretorGlobal] = useState('');
  
  // Config Modal Diretor
  const [modalDiretor, setModalDiretor] = useState(false);
  const [codigoTempDiretor, setCodigoTempDiretor] = useState('');
  const [blocoCodigoDiretorAtivo, setBlocoCodigoDiretorAtivo] = useState(false);
  
  // Form de Cadastro / Edição
  const [fichaId, setFichaId] = useState<string | number | null>(null);
  const [form, setForm] = useState({
    nome: '', cpf: '', rg: '', email: '', telefone: '', dataNascimento: '',
    urlAssinatura: '', endereco: '', formacaoAcademica: '', cargo: '',
    matricula: '', dataAdmissao: ''
  });
  const [codigoTemporario, setCodigoTemporario] = useState('');
  const [blocoCodigoAtivo, setBlocoCodigoAtivo] = useState(false);
  
  // Fluxo de Captura no Celular (canvas-aluno)
  const [alunoCodigo, setAlunoCodigo] = useState('');
  const [modoCaptura, setModoCaptura] = useState<'aluno' | 'diretor'>('aluno');
  const [alunoFichaId, setAlunoFichaId] = useState<string | number | null>(null);
  
  // Toast
  const [toast, setToast] = useState<{ visible: boolean; msg: string; tipo: 'sucesso' | 'erro' | 'alerta' }>({
    visible: false,
    msg: '',
    tipo: 'sucesso'
  });

  // Print Layout Data
  const [printData, setPrintData] = useState<any>({
    nome: '', cpf: '', rg: '', email: '', telefone: '', dataNascimento: '',
    urlAssinatura: '', endereco: '', formacaoAcademica: '', cargo: '',
    matricula: '', dataAdmissao: ''
  });

  // Polling Refs
  const pollingInterval = useRef<any>(null);
  const pollingDiretorInterval = useRef<any>(null);

  const mostrarPopup = (msg: string, tipo: 'sucesso' | 'erro' | 'alerta' = 'sucesso') => {
    setToast({ visible: true, msg, tipo });
    setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }));
    }, 4000);
  };

  // Auth Listener
  useEffect(() => {
    const { data: { subscription } } = sbClient.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        setUsuarioLogado(session.user);
        await carregarConfiguracaoDiretor();
        await carregarFichasGrid();
        setScreen('adm');
      } else {
        setUsuarioLogado(null);
        setScreen('login');
      }
      setLoadingInicial(false);
    });

    return () => {
      subscription.unsubscribe();
      if (pollingInterval.current) clearInterval(pollingInterval.current);
      if (pollingDiretorInterval.current) clearInterval(pollingDiretorInterval.current);
    };
  }, []);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !senha) {
      mostrarPopup('Por favor, preencha o e-mail e a senha.', 'alerta');
      return;
    }
    setLoadingAuth(true);
    try {
      const { error } = await sbClient.auth.signInWithPassword({ email, password: senha });
      if (error) throw error;
      mostrarPopup('Login realizado com sucesso!', 'sucesso');
    } catch (err: any) {
      mostrarPopup('Erro ao fazer login: ' + err.message, 'erro');
    } finally {
      setLoadingAuth(false);
    }
  };

  const logout = async () => {
    await sbClient.auth.signOut();
    setNomeDiretor('Diretor');
    setAssinaturaDiretorGlobal('');
    setEmail('');
    setSenha('');
    setScreen('login');
  };

  const carregarFichasGrid = async () => {
    setLoadingFichas(true);
    try {
      const { data, error } = await sbClient.from('cadastros').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setFichas(data || []);
    } catch (err: any) {
      mostrarPopup('Erro ao buscar fichas: ' + err.message, 'erro');
    } finally {
      setLoadingFichas(false);
    }
  };

  const carregarConfiguracaoDiretor = async () => {
    try {
      const { data } = await sbClient.from('configuracoes_sistema').select('assinatura_diretor, nome_diretor').eq('id', 'singleton').single();
      if (data) {
        setAssinaturaDiretorGlobal(data.assinatura_diretor ? `${data.assinatura_diretor}?t=${Date.now()}` : '');
        if (data.nome_diretor) setNomeDiretor(data.nome_diretor);
      }
    } catch (e) {
      console.warn('Config diretor:', e);
    }
  };

  const abrirModalDiretor = () => {
    setModalDiretor(true);
  };

  const gerarCodigoDiretor = async () => {
    const codigo = String(Math.floor(1000 + Math.random() * 9000));
    const expira = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const { error } = await sbClient.from('configuracoes_sistema').update({ codigo_temp_diretor: codigo, codigo_expira_em: expira }).eq('id', 'singleton');
    if (error) {
      mostrarPopup('Erro ao gerar código: ' + error.message, 'erro');
      return;
    }
    setCodigoTempDiretor(codigo);
    setBlocoCodigoDiretorAtivo(true);

    if (pollingDiretorInterval.current) clearInterval(pollingDiretorInterval.current);
    pollingDiretorInterval.current = setInterval(async () => {
      const { data } = await sbClient.from('configuracoes_sistema').select('assinatura_diretor, codigo_temp_diretor').eq('id', 'singleton').single();
      if (data && data.assinatura_diretor && !data.codigo_temp_diretor) {
        clearInterval(pollingDiretorInterval.current);
        setAssinaturaDiretorGlobal(`${data.assinatura_diretor}?t=${Date.now()}`);
        setBlocoCodigoDiretorAtivo(false);
        setCodigoTempDiretor('');
        setModalDiretor(false);
        mostrarPopup('Assinatura do Diretor capturada com sucesso!', 'sucesso');
      }
    }, 3000);

    setTimeout(() => {
      if (pollingDiretorInterval.current) clearInterval(pollingDiretorInterval.current);
      setBlocoCodigoDiretorAtivo(prev => {
        if (prev) {
          sbClient.from('configuracoes_sistema').update({ codigo_temp_diretor: null }).eq('id', 'singleton');
          setCodigoTempDiretor('');
          mostrarPopup('O código expirou. Gere outro se necessário.', 'alerta');
          return false;
        }
        return false;
      });
    }, 600000);
  };

  const abrirNovaFicha = () => {
    setFichaId(null);
    setForm({
      nome: '', cpf: '', rg: '', email: '', telefone: '', dataNascimento: '',
      urlAssinatura: '', endereco: '', formacaoAcademica: '', cargo: '',
      matricula: '', dataAdmissao: ''
    });
    setCodigoTemporario('');
    setBlocoCodigoAtivo(false);
    setScreen('formulario');
  };

  const editarFicha = async (id: string | number) => {
    setFichaId(id);
    try {
      const { data, error } = await sbClient.from('cadastros').select('*').eq('id', id).single();
      if (error) throw error;
      setForm({
        nome: data.nome,
        cpf: data.cpf,
        rg: data.rg || '',
        email: data.email || '',
        telefone: data.telefone || '',
        dataNascimento: data.data_nascimento || '',
        urlAssinatura: data.url_assinatura ? `${data.url_assinatura}?t=${Date.now()}` : '',
        endereco: data.endereco || '',
        formacaoAcademica: data.formacao_academica || '',
        cargo: data.cargo || '',
        matricula: data.matricula || '',
        dataAdmissao: data.data_admissao || ''
      });
      setCodigoTemporario('');
      setBlocoCodigoAtivo(false);
      setScreen('formulario');
    } catch (err: any) {
      mostrarPopup('Erro ao buscar dados da ficha: ' + err.message, 'erro');
    }
  };

  const gerarCodigoTemporario = async () => {
    if (!form.nome || !form.cpf) {
      mostrarPopup('Por favor, preencha o Nome e o CPF antes de colher a assinatura.', 'alerta');
      return;
    }
    const tokenAleatorio = String(Math.floor(1000 + Math.random() * 9000));
    let currentFichaId = fichaId;
    if (!currentFichaId) {
      const { data, error } = await sbClient.from('cadastros').insert([{
        nome: form.nome, cpf: form.cpf, rg: form.rg || null, email: form.email,
        telefone: form.telefone, data_nascimento: form.dataNascimento || null,
        endereco: form.endereco || null, formacao_academica: form.formacaoAcademica || null,
        cargo: form.cargo || null, matricula: form.matricula || null,
        data_admissao: form.dataAdmissao || null, codigo_temporario: tokenAleatorio,
        status_assinatura: 'pendente'
      }]).select().single();
      if (error) {
        mostrarPopup('Erro ao iniciar captura: ' + error.message, 'erro');
        return;
      }
      currentFichaId = data.id;
      setFichaId(data.id);
    } else {
      const { error } = await sbClient.from('cadastros').update({
        codigo_temporario: tokenAleatorio, status_assinatura: 'pendente'
      }).eq('id', currentFichaId);
      if (error) {
        mostrarPopup('Erro ao atualizar token: ' + error.message, 'erro');
        return;
      }
    }
    setCodigoTemporario(tokenAleatorio);
    setBlocoCodigoAtivo(true);

    if (pollingInterval.current) clearInterval(pollingInterval.current);
    pollingInterval.current = setInterval(async () => {
      const { data } = await sbClient.from('cadastros').select('url_assinatura, status_assinatura').eq('id', currentFichaId).single();
      if (data && data.url_assinatura && data.status_assinatura === 'assinado') {
        clearInterval(pollingInterval.current);
        setForm(prev => ({ ...prev, urlAssinatura: `${data.url_assinatura}?t=${Date.now()}` }));
        setBlocoCodigoAtivo(false);
        setCodigoTemporario('');
        mostrarPopup('Assinatura capturada com sucesso!', 'sucesso');
      }
    }, 3000);

    setTimeout(async () => {
      if (pollingInterval.current) clearInterval(pollingInterval.current);
      setBlocoCodigoAtivo(prev => {
        if (prev) {
          sbClient.from('cadastros').update({ codigo_temporario: null }).eq('id', currentFichaId);
          setCodigoTemporario('');
          mostrarPopup('O código expirou. Gere outro se necessário.', 'alerta');
          return false;
        }
        return false;
      });
    }, 600000);
  };

  const salvarFichaCompleta = async () => {
    if (!form.nome || !form.cpf) {
      mostrarPopup('Por favor, preencha o Nome e o CPF.', 'alerta');
      return;
    }
    try {
      const payload = {
        nome: form.nome, cpf: form.cpf, rg: form.rg || null, email: form.email,
        telefone: form.telefone, data_nascimento: form.dataNascimento || null,
        endereco: form.endereco || null, formacao_academica: form.formacaoAcademica || null,
        cargo: form.cargo || null, matricula: form.matricula || null,
        data_admissao: form.dataAdmissao || null, codigo_temporario: null
      };
      if (fichaId) {
        const { error } = await sbClient.from('cadastros').update(payload).eq('id', fichaId);
        if (error) throw error;
      } else {
        const { error } = await sbClient.from('cadastros').insert([{ ...payload, status_assinatura: 'pendente' }]);
        if (error) throw error;
      }
      mostrarPopup('Ficha salva com sucesso!', 'sucesso');
      setScreen('adm');
      await carregarFichasGrid();
    } catch (err: any) {
      mostrarPopup('Erro ao salvar a ficha: ' + err.message, 'erro');
    }
  };

  const validarCodigoAluno = async () => {
    const codigo = alunoCodigo.trim().toUpperCase();
    if (!codigo) {
      mostrarPopup('Por favor, insira o código.', 'alerta');
      return;
    }
    try {
      const { data: configData } = await sbClient.from('configuracoes_sistema').select('id, codigo_expira_em').eq('codigo_temp_diretor', codigo);
      if (configData && configData.length > 0) {
        const config = configData[0];
        if (config.codigo_expira_em && new Date(config.codigo_expira_em) < new Date()) {
          mostrarPopup('Este código já expirou.', 'erro');
          return;
        }
        setModoCaptura('diretor');
        setAlunoFichaId('diretor-singleton');
        setScreen('canvas-aluno');
        return;
      }
    } catch (e) {
      console.warn('Erro ao verificar código do diretor:', e);
    }
    try {
      const { data, error } = await sbClient.from('cadastros').select('id, nome').eq('codigo_temporario', codigo);
      if (error || !data || data.length === 0) {
        mostrarPopup('Código inválido ou expirado.', 'erro');
        return;
      }
      setModoCaptura('aluno');
      setAlunoFichaId(data[0].id);
      setScreen('canvas-aluno');
    } catch (err) {
      mostrarPopup('Código inválido ou expirado.', 'erro');
    }
  };

  const base64ToBlob = (base64: string, mimeType: string) => {
    const byteCharacters = atob(base64.split(',')[1]);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    return new Blob([new Uint8Array(byteNumbers)], { type: mimeType });
  };

  const enviarAssinaturaSupabase = async (dataURL: string) => {
    setLoadingAuth(true); // Using auth spinner logic for submission loading
    try {
      const blob = base64ToBlob(dataURL, 'image/png');
      const filename = modoCaptura === 'diretor' ? 'diretor_assinatura.png' : `aluno_${alunoFichaId}.png`;

      const { error: uploadError } = await sbClient.storage
        .from('assinaturas')
        .upload(filename, blob, { contentType: 'image/png', upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = sbClient.storage
        .from('assinaturas')
        .getPublicUrl(filename);

      if (modoCaptura === 'diretor') {
        const { error } = await sbClient.from('configuracoes_sistema').update({
          assinatura_diretor: publicUrl,
          codigo_temp_diretor: null,
          atualizado_em: new Date().toISOString()
        }).eq('id', 'singleton');
        if (error) throw error;
        setAssinaturaDiretorGlobal(`${publicUrl}?t=${Date.now()}`);
        mostrarPopup('Assinatura do Diretor enviada com sucesso!', 'sucesso');
      } else {
        if (!alunoFichaId) {
          mostrarPopup('Erro: Registro do aluno não identificado.', 'erro');
          return;
        }
        const { error } = await sbClient.from('cadastros').update({
          url_assinatura: publicUrl, status_assinatura: 'assinado', codigo_temporario: null
        }).eq('id', alunoFichaId);
        if (error) throw error;
        mostrarPopup('Assinatura enviada com sucesso!', 'sucesso');
      }
      setAlunoCodigo('');
      setAlunoFichaId(null);
      setModoCaptura('aluno');
      setScreen('login');
    } catch (err: any) {
      mostrarPopup('Erro ao enviar assinatura: ' + err.message, 'erro');
    } finally {
      setLoadingAuth(false);
    }
  };

  const aguardarImagensEImprimir = async (urlAss: string, urlDir: string) => {
    const promises: Promise<void>[] = [];
    if (urlAss) {
      promises.push(new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = () => resolve();
        img.src = urlAss;
      }));
    }
    if (urlDir) {
      promises.push(new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = () => resolve();
        img.src = urlDir;
      }));
    }
    if (promises.length > 0) {
      await Promise.all(promises);
    }
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const visualizarDocumento = () => {
    setPrintData({ ...form });
    const urlAss = form.urlAssinatura;
    const urlDir = assinaturaDiretorGlobal;
    setTimeout(async () => {
      await aguardarImagensEImprimir(urlAss, urlDir);
    }, 50);
  };

  const imprimirFichaDireto = (item: Ficha) => {
    const urlAss = item.url_assinatura ? `${item.url_assinatura}?t=${Date.now()}` : '';
    const urlDir = assinaturaDiretorGlobal ? (assinaturaDiretorGlobal.includes('?t=') ? assinaturaDiretorGlobal : `${assinaturaDiretorGlobal}?t=${Date.now()}`) : '';
    setPrintData({
      nome: item.nome,
      cpf: item.cpf,
      rg: item.rg || '',
      email: item.email || '',
      telefone: item.telefone || '',
      dataNascimento: item.data_nascimento || '',
      urlAssinatura: urlAss,
      endereco: item.endereco || '',
      formacaoAcademica: item.formacao_academica || '',
      cargo: item.cargo || '',
      matricula: item.matricula || '',
      dataAdmissao: item.data_admissao || ''
    });
    setTimeout(async () => {
      await aguardarImagensEImprimir(urlAss, urlDir);
    }, 50);
  };

  const forcarAtualizacaoManual = () => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        for (const reg of registrations) { reg.unregister(); }
      });
    }
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => caches.delete(name));
      });
    }
    window.location.reload();
  };

  if (loadingInicial) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] text-center">
        <span className="animate-spin-custom rounded-full h-9 w-9 border-4 border-slate-200 border-t-primary"></span>
        <p className="mt-4 text-slate-500 text-sm font-medium">Carregando o sistema...</p>
      </div>
    );
  }

  return (
    <>
      <div className="no-print">
        {/* Toast Alert */}
        <div 
          className={`fixed top-5 left-1/2 -translate-x-1/2 py-3 px-6 rounded-lg shadow-md font-bold z-[9999] min-w-[280px] max-w-[90%] text-center box-border transition-all duration-300 ${
            toast.visible ? 'visible opacity-100 translate-y-0' : 'invisible opacity-0 -translate-y-5'
          } ${
            toast.tipo === 'sucesso' ? 'bg-emerald-50 text-emerald-800 border-l-5 border-emerald-500' :
            toast.tipo === 'erro' ? 'bg-red-50 text-red-800 border-l-5 border-red-500' :
            'bg-orange-50 text-orange-800 border-l-5 border-orange-500'
          }`}
        >
          {toast.msg}
        </div>

        {/* Login Screen */}
        {screen === 'login' && (
          <div className="animate-fadeIn">
            <div className="flex justify-end mb-5">
              <button 
                onClick={() => setScreen('captura-codigo')}
                className="w-auto bg-orange-50 text-primary border border-orange-200 py-2 px-5 text-sm rounded-lg flex items-center gap-2 hover:bg-primary hover:text-white transition-all cursor-pointer font-semibold"
              >
                <Signature className="w-4 h-4" /> Submeter Assinatura
              </button>
            </div>
            <form className="bg-white border border-black/8 rounded-2xl p-6 shadow-sm max-w-[450px] mx-auto" onSubmit={login}>
              <div className="text-center mb-5">
                <div className="bg-orange-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Lock className="w-8 h-8 text-primary" />
                </div>
                <h3 className="m-0 text-2xl font-bold text-slate-800">TESTES ALPHA</h3>
                <p className="text-sm text-slate-500 mt-1">Faça login na sua conta de diretor</p>
              </div>
              <div className="relative mb-3">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4.5 h-4.5" />
                <input 
                  type="email" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  placeholder="E-mail" 
                  required
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-black/12 text-sm bg-white text-slate-800"
                />
              </div>
              <div className="relative mb-4">
                <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4.5 h-4.5" />
                <input 
                  type="password" 
                  value={senha} 
                  onChange={e => setSenha(e.target.value)} 
                  placeholder="Senha" 
                  required
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-black/12 text-sm bg-white text-slate-800"
                />
              </div>
              <button 
                type="submit" 
                disabled={loadingAuth} 
                className="w-full bg-primary hover:bg-primary-hover disabled:bg-slate-200 disabled:text-slate-400 text-white font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all duration-200"
              >
                {loadingAuth ? (
                  <span className="animate-spin-custom rounded-full h-4 w-4 border-2 border-white/30 border-t-white"></span>
                ) : (
                  'Entrar no Sistema'
                )}
              </button>
              <a 
                href="#" 
                onClick={(e) => { e.preventDefault(); forcarAtualizacaoManual(); }}
                className="block text-center text-xs mt-5 text-slate-400 hover:text-primary transition-all duration-200"
              >
                🔄 Forçar Atualização (Limpar Cache)
              </a>
            </form>
          </div>
        )}

        {/* Admin Dashboard */}
        {screen === 'adm' && (
          <div className="animate-fadeIn">
            <div className="bg-white border border-black/8 rounded-2xl p-6 shadow-sm mb-5">
              <div className="flex justify-between items-center mb-5 border-b border-black/8 pb-4">
                <div className="flex items-center gap-2">
                  <div className="bg-orange-50 w-9 h-9 rounded-full flex items-center justify-center">
                    <User className="w-[18px] h-[18px] text-primary" />
                  </div>
                  <span className="font-semibold text-slate-800 text-sm">Olá, {nomeDiretor}</span>
                  <button 
                    onClick={abrirModalDiretor} 
                    className="bg-transparent border border-black/10 hover:bg-orange-50 hover:text-primary hover:border-orange-200 text-slate-400 w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer transition-all duration-200 rotate-0 hover:rotate-30" 
                    title="Configurações do Diretor"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                </div>
                <button 
                  onClick={logout} 
                  className="w-auto bg-red-500 hover:bg-red-600 text-white font-semibold py-1.5 px-4 rounded-lg flex items-center justify-center gap-2 cursor-pointer transition-all duration-200"
                >
                  <LogOut className="w-4 h-4" /> Sair
                </button>
              </div>

              <div className="flex gap-3 mb-5">
                <button 
                  onClick={abrirNovaFicha} 
                  className="w-auto bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-2.5 px-5 rounded-lg flex items-center gap-2 cursor-pointer transition-all duration-200"
                >
                  <Plus className="w-4 h-4" /> Criar Nova Ficha
                </button>
                <button 
                  onClick={carregarFichasGrid} 
                  disabled={loadingFichas}
                  className="w-auto bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 py-2.5 px-5 rounded-lg font-semibold flex items-center gap-2 cursor-pointer transition-all duration-200"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingFichas ? 'animate-spin-custom' : ''}`} /> Atualizar Lista
                </button>
              </div>

              <h3 className="text-lg font-bold mb-4 text-slate-800">Fichas Cadastradas</h3>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse mt-4 bg-white rounded-xl overflow-hidden border border-black/8">
                  <thead>
                    <tr className="bg-orange-50/50">
                      <th className="text-primary-hover py-3 px-4 text-left font-semibold text-sm border-b border-black/8">Nome</th>
                      <th className="text-primary-hover py-3 px-4 text-left font-semibold text-sm border-b border-black/8">CPF</th>
                      <th className="text-primary-hover py-3 px-4 text-left font-semibold text-sm border-b border-black/8">Assinatura</th>
                      <th className="text-primary-hover py-3 px-4 text-left font-semibold text-sm border-b border-black/8">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fichas.map(item => (
                      <tr key={item.id} className="hover:bg-slate-50 transition-all border-b border-black/8 last:border-b-0">
                        <td className="py-3 px-4 font-semibold text-slate-800 text-sm">{item.nome}</td>
                        <td className="py-3 px-4 text-slate-500 text-sm">{item.cpf}</td>
                        <td className="py-3 px-4 text-sm">
                          {item.url_assinatura ? (
                            <span className="inline-flex items-center gap-1.5 py-1 px-3 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800">
                              <Check className="w-3.5 h-3.5" /> Assinado
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 py-1 px-3 rounded-full text-xs font-semibold bg-orange-50 text-orange-800">
                              <Clock className="w-3.5 h-3.5" /> Pendente
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 flex gap-2">
                          <button 
                            onClick={() => editarFicha(item.id)} 
                            className="bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 py-1.5 px-3 rounded-lg text-xs font-semibold cursor-pointer transition-all duration-200"
                          >
                            Editar
                          </button>
                          <button 
                            onClick={() => imprimirFichaDireto(item)} 
                            className="bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 py-1.5 px-3 rounded-lg text-xs font-semibold cursor-pointer transition-all duration-200"
                          >
                            Imprimir
                          </button>
                        </td>
                      </tr>
                    ))}
                    {fichas.length === 0 && !loadingFichas && (
                      <tr>
                        <td colSpan={4} className="text-center text-slate-500 py-8 text-sm">
                          Nenhuma ficha cadastrada ainda.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Director Config Modal */}
            {modalDiretor && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[5000] p-5">
                <div className="bg-white rounded-2xl p-7 max-w-[480px] w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-fadeIn">
                  <div className="flex justify-between items-center mb-5 border-b border-black/8 pb-4">
                    <h3 className="m-0 text-lg font-bold flex items-center gap-2 text-slate-800">
                      <Settings className="w-5 h-5 text-primary" /> Configurações do Diretor
                    </h3>
                    <button 
                      onClick={() => setModalDiretor(false)} 
                      className="bg-white border border-slate-300 text-slate-800 hover:bg-slate-50 rounded-lg p-1.5 cursor-pointer transition-all"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {assinaturaDiretorGlobal && (
                    <div className="mb-4">
                      <p className="font-semibold text-sm mb-2 text-slate-500">Assinatura atual:</p>
                      <div className="bg-slate-50 rounded-lg p-3 border border-black/8 text-center">
                        <img src={assinaturaDiretorGlobal} className="max-h-[70px] mx-auto" alt="Assinatura do Diretor" />
                      </div>
                    </div>
                  )}

                  {!blocoCodigoDiretorAtivo ? (
                    <div>
                      <p className="text-xs text-slate-500 mb-3">
                        {assinaturaDiretorGlobal ? 'Recapture sua assinatura padrão. Ela será embutida em todas as fichas.' : 'Capture sua assinatura padrão. Ela será embutida em todas as fichas impressas.'}
                      </p>
                      <button 
                        onClick={gerarCodigoDiretor}
                        className="w-full bg-primary hover:bg-primary-hover text-white font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all duration-200"
                      >
                        <Signature className="w-4 h-4" /> {assinaturaDiretorGlobal ? 'Recapturar Assinatura do Diretor' : 'Capturar Minha Assinatura'}
                      </button>
                    </div>
                  ) : (
                    <div className="text-center">
                      <p className="text-sm font-semibold mb-2 text-slate-800">Acesse o site no celular e digite o código:</p>
                      <div className="text-3xl font-bold text-primary tracking-widest my-4">{codigoTempDiretor}</div>
                      <p className="text-xs text-primary font-semibold flex items-center justify-center gap-1">
                        <Loader2 className="w-3.5 h-3.5 animate-spin-custom" /> Aguardando assinatura no celular... (10 min)
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Matricula Form Screen */}
        {screen === 'formulario' && (
          <div className="animate-fadeIn">
            <div className="bg-white border border-black/8 rounded-2xl p-6 shadow-sm">
              <h3 className="text-xl font-bold mt-0 mb-5 text-slate-800">
                {fichaId ? 'Editar Ficha de Cadastro' : 'Nova Ficha de Cadastro'}
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-xs mb-1 block text-slate-500">Nome Completo:</label>
                  <input 
                    type="text" 
                    value={form.nome} 
                    onChange={e => setForm({ ...form, nome: e.target.value })} 
                    placeholder="Nome do Aluno"
                    className="w-full py-3 px-4 rounded-xl border border-black/12 text-sm bg-white text-slate-800"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-xs mb-1 block text-slate-500">CPF:</label>
                    <input 
                      type="text" 
                      value={form.cpf} 
                      onChange={e => setForm({ ...form, cpf: e.target.value })} 
                      placeholder="000.000.000-00"
                      className="w-full py-3 px-4 rounded-xl border border-black/12 text-sm bg-white text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-xs mb-1 block text-slate-500">RG:</label>
                    <input 
                      type="text" 
                      value={form.rg} 
                      onChange={e => setForm({ ...form, rg: e.target.value })} 
                      placeholder="Identidade"
                      className="w-full py-3 px-4 rounded-xl border border-black/12 text-sm bg-white text-slate-800"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
                <div>
                  <label className="font-semibold text-xs mb-1 block text-slate-500">E-mail:</label>
                  <input 
                    type="email" 
                    value={form.email} 
                    onChange={e => setForm({ ...form, email: e.target.value })} 
                    placeholder="exemplo@email.com"
                    className="w-full py-3 px-4 rounded-xl border border-black/12 text-sm bg-white text-slate-800"
                  />
                </div>
                <div>
                  <label className="font-semibold text-xs mb-1 block text-slate-500">Telefone:</label>
                  <input 
                    type="text" 
                    value={form.telefone} 
                    onChange={e => setForm({ ...form, telefone: e.target.value })} 
                    placeholder="(75) 99999-9999"
                    className="w-full py-3 px-4 rounded-xl border border-black/12 text-sm bg-white text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
                <div>
                  <label className="font-semibold text-xs mb-1 block text-slate-500">Matrícula:</label>
                  <input 
                    type="text" 
                    value={form.matricula} 
                    onChange={e => setForm({ ...form, matricula: e.target.value })} 
                    placeholder="Código Funcional"
                    className="w-full py-3 px-4 rounded-xl border border-black/12 text-sm bg-white text-slate-800"
                  />
                </div>
                <div>
                  <label className="font-semibold text-xs mb-1 block text-slate-500">Data de Admissão:</label>
                  <input 
                    type="date" 
                    value={form.dataAdmissao} 
                    onChange={e => setForm({ ...form, dataAdmissao: e.target.value })}
                    className="w-full py-3 px-4 rounded-xl border border-black/12 text-sm bg-white text-slate-800"
                  />
                </div>
              </div>

              <div className="mt-3">
                <label className="font-semibold text-xs mb-1 block text-slate-500">Endereço:</label>
                <input 
                  type="text" 
                  value={form.endereco} 
                  onChange={e => setForm({ ...form, endereco: e.target.value })} 
                  placeholder="Rua, número, bairro, cidade"
                  className="w-full py-3 px-4 rounded-xl border border-black/12 text-sm bg-white text-slate-800"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
                <div>
                  <label className="font-semibold text-xs mb-1 block text-slate-500">Formação Acadêmica:</label>
                  <input 
                    type="text" 
                    value={form.formacaoAcademica} 
                    onChange={e => setForm({ ...form, formacaoAcademica: e.target.value })} 
                    placeholder="Ex: Ensino Médio Completo"
                    className="w-full py-3 px-4 rounded-xl border border-black/12 text-sm bg-white text-slate-800"
                  />
                </div>
                <div>
                  <label className="font-semibold text-xs mb-1 block text-slate-500">Cargo / Função:</label>
                  <input 
                    type="text" 
                    value={form.cargo} 
                    onChange={e => setForm({ ...form, cargo: e.target.value })} 
                    placeholder="Ex: Professor"
                    className="w-full py-3 px-4 rounded-xl border border-black/12 text-sm bg-white text-slate-800"
                  />
                </div>
              </div>

              {/* Signature Section */}
              <div className="bg-orange-50/50 border-2 border-dashed border-orange-200 rounded-xl p-5 text-center mt-5">
                <h4 className="m-0 text-base font-bold text-primary-hover">Coleta de Assinatura Digital</h4>
                {form.urlAssinatura ? (
                  <div>
                    <p className="text-emerald-800 font-semibold my-2 inline-flex items-center gap-1 text-sm">
                      <CheckCircle className="w-4 h-4 text-emerald-500" /> Assinatura carregada
                    </p>
                    <div className="bg-white rounded-lg p-3 max-w-[300px] mx-auto my-2 border border-black/6">
                      <img src={form.urlAssinatura} className="max-h-[90px] mx-auto mt-2" alt="Assinatura" />
                    </div>
                  </div>
                ) : null}

                {!blocoCodigoAtivo ? (
                  <div className="mt-3">
                    <button 
                      type="button" 
                      onClick={gerarCodigoTemporario} 
                      className="w-auto bg-primary hover:bg-primary-hover text-white font-semibold py-2.5 px-5 rounded-lg flex items-center justify-center gap-2 cursor-pointer transition-all duration-200"
                    >
                      <Signature className="w-4 h-4" /> {form.urlAssinatura ? 'Recapturar Assinatura' : 'Capturar Assinatura'}
                    </button>
                  </div>
                ) : (
                  <div className="mt-3">
                    <p className="my-1.5 text-sm font-semibold text-slate-800">Peça para o aluno acessar o site e digitar o código abaixo:</p>
                    <div className="text-3xl font-bold text-primary tracking-widest my-4">{codigoTemporario}</div>
                    <p className="text-xs text-primary font-semibold flex items-center justify-center gap-1">
                      <Loader2 className="w-3.5 h-3.5 animate-spin-custom" /> Aguardando preenchimento no celular... (10 min)
                    </p>
                  </div>
                )}
              </div>

              {/* Form Buttons */}
              <div className="flex gap-3 mt-6">
                <button 
                  onClick={salvarFichaCompleta} 
                  className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-3 px-5 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all duration-200"
                >
                  <Save className="w-4 h-4" /> Salvar Ficha
                </button>
                <button 
                  onClick={visualizarDocumento} 
                  className="w-auto bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 py-3 px-5 rounded-xl font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all duration-200"
                >
                  <Printer className="w-4 h-4" /> Imprimir Documento
                </button>
                <button 
                  onClick={() => setScreen('adm')} 
                  className="w-auto bg-red-500 hover:bg-red-600 text-white font-semibold py-3 px-5 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all duration-200"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Enter Signature Code Screen */}
        {screen === 'captura-codigo' && (
          <div className="animate-fadeIn">
            <div className="bg-white border border-black/8 rounded-2xl p-6 shadow-sm max-w-[400px] mx-auto text-center">
              <div className="bg-orange-50 w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShieldCheck className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-xl font-bold mt-0 text-slate-800">Validar Código de Assinatura</h3>
              <p className="text-slate-500 text-sm mb-5">Insira o código gerado no sistema do diretor.</p>
              <input 
                type="text" 
                value={alunoCodigo} 
                onChange={e => setAlunoCodigo(e.target.value)} 
                placeholder="Ex: 1234" 
                className="w-full py-3 px-4 rounded-xl border border-black/12 text-2xl font-bold text-center uppercase tracking-widest bg-white text-slate-800"
              />
              <button 
                onClick={validarCodigoAluno} 
                className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all duration-200 w-full mt-4"
              >
                Entrar na Tela de Escrita
              </button>
              <button 
                onClick={() => setScreen('login')} 
                className="w-full bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 py-3 px-4 rounded-xl font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all duration-200 mt-2"
              >
                Voltar ao Início
              </button>
            </div>
          </div>
        )}

        {/* Touch Canvas Drawing Screen */}
        {screen === 'canvas-aluno' && (
          <div className="animate-fadeIn">
            <SignatureCanvas 
              loading={loadingAuth} // Uses auth loading spinner logic
              onConfirm={enviarAssinaturaSupabase} 
              onCancel={() => {
                setAlunoCodigo('');
                setAlunoFichaId(null);
                setModoCaptura('aluno');
                setScreen('login');
              }} 
            />
          </div>
        )}
      </div>

      {/* Printing Area (Hidden on screen via globals.css) */}
      <div id="area-impressao">
        <div className="ficha-wrap">
          <div className="ficha-header">
            <img className="logo-prefeitura" src="/logo_prefeitura_azul.png" alt="Prefeitura de Sapeaçu" />
            <div className="ficha-header-title">
              <h1>Ficha de Matrícula</h1>
              <p>Secretaria Municipal de Educação</p>
            </div>
            <img className="logo-secretaria" src="/logo_secretaria_azul.png" alt="Prefeitura de Sapeaçu" />
          </div>

          <div className="ficha-secao-titulo">DADOS DO ESTUDANTE / SERVIDOR</div>
          <div className="ficha-grid">
            <div className="ficha-row">
              <div className="ficha-cell" style={{ flex: 3.5 }}>
                <span className="ficha-label">Nome</span>
                <span className="ficha-valor">{printData.nome}</span>
              </div>
              <div className="ficha-cell" style={{ flex: 1.2 }}>
                <span className="ficha-label">Matrícula</span>
                <span className="ficha-valor">{printData.matricula}</span>
              </div>
              <div className="ficha-cell" style={{ flex: 1.5 }}>
                <span className="ficha-label">RG</span>
                <span className="ficha-valor">{printData.rg}</span>
              </div>
              <div className="ficha-cell" style={{ flex: 1.5 }}>
                <span className="ficha-label">CPF</span>
                <span className="ficha-valor">{printData.cpf}</span>
              </div>
            </div>
            <div className="ficha-row">
              <div className="ficha-cell">
                <span className="ficha-label">Data de Nascimento</span>
                <span className="ficha-valor">{printData.dataNascimento}</span>
              </div>
              <div className="ficha-cell">
                <span className="ficha-label">Telefone</span>
                <span className="ficha-valor">{printData.telefone}</span>
              </div>
              <div className="ficha-cell" style={{ flex: 2 }}>
                <span className="ficha-label">E-mail</span>
                <span className="ficha-valor">{printData.email}</span>
              </div>
            </div>
            <div className="ficha-row">
              <div className="ficha-cell">
                <span className="ficha-label">Endereço</span>
                <span className="ficha-valor">{printData.endereco}</span>
              </div>
            </div>
            <div className="ficha-row">
              <div className="ficha-cell">
                <span className="ficha-label">Data de Admissão</span>
                <span className="ficha-valor">{printData.dataAdmissao}</span>
              </div>
              <div className="ficha-cell">
                <span className="ficha-label">Formação Acadêmica</span>
                <span className="ficha-valor">{printData.formacaoAcademica}</span>
              </div>
              <div className="ficha-cell">
                <span className="ficha-label">Cargo / Função</span>
                <span className="ficha-valor">{printData.cargo}</span>
              </div>
            </div>
          </div>

          <p className="ficha-declaracao">
            Declaro serem verdadeiras todas as informações prestadas neste formulário de matrícula, respondendo civil e criminalmente pela veracidade dos dados informados.
          </p>

          <div className="ficha-assinaturas">
            <div className="ficha-ass-col">
              <div className="ficha-ass-linha">
                {printData.urlAssinatura ? (
                  <img src={printData.urlAssinatura} alt="Assinatura do Estudante" />
                ) : null}
              </div>
              <div className="ficha-ass-label">Assinatura do Estudante / Responsável</div>
            </div>
            <div className="ficha-ass-col">
              <div className="ficha-ass-linha">
                {assinaturaDiretorGlobal ? (
                  <img src={assinaturaDiretorGlobal} alt="Assinatura do Diretor" />
                ) : null}
              </div>
              <div className="ficha-ass-label">Assinatura do Diretor</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
