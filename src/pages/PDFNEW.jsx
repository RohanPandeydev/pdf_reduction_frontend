import {
  FileText,
  Trash2,
  Shield,
  Upload,
  Search,
  Edit,
  ArrowLeft,
  X,
  Plus,
  CheckCircle,
  AlertCircle,
  Download,
  Eye,
} from "lucide-react";
import { useRef, useState, useEffect } from "react";

const PDFRedactionApp = () => {
  const [view, setView] = useState("list");
  const [pdfs, setPdfs] = useState([]);
  const [currentPdf, setCurrentPdf] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [matches, setMatches] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [notification, setNotification] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const fileInputRef = useRef(null);

  const API_BASE = "http://localhost:5000";

  const showNotification = (message, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const fetchPdfs = async (searchQuery = "", currentPage = 1) => {
    try {
      const response = await fetch(
        `${API_BASE}/api/pdfs?page=${currentPage}&per_page=10&search=${searchQuery}`
      );
      const data = await response.json();
      if (data.success) {
        setPdfs(data.pdfs);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error("Error fetching PDFs:", error);
      showNotification("Failed to load PDFs", "error");
    }
  };

  useEffect(() => {
    fetchPdfs(searchQuery, page);
  }, [page]);

  const handleSearchPdfs = () => {
    setPage(1);
    fetchPdfs(searchQuery, 1);
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file && file.type === "application/pdf") {
      setSelectedFile(file);
    } else {
      showNotification("Please select a valid PDF file", "error");
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await fetch(`${API_BASE}/upload-pdf`, {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        showNotification("PDF uploaded successfully!");
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        fetchPdfs(searchQuery, page);
        setView("list");
      } else {
        showNotification(result.error || "Upload failed", "error");
      }
    } catch (error) {
      console.error("Upload error:", error);
      showNotification("Failed to upload PDF", "error");
    } finally {
      setIsUploading(false);
    }
  };

  const handleEditPdf = (pdf) => {
    setCurrentPdf(pdf);
    setView("edit");
    setMatches([]);
    setSearchTerm("");
  };

  const handleDeletePdf = async (pdfId) => {
    if (!confirm("Are you sure you want to delete this PDF?")) return;

    try {
      const response = await fetch(`${API_BASE}/api/pdfs/${pdfId}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (result.success) {
        showNotification("PDF deleted successfully!");
        fetchPdfs(searchQuery, page);
      } else {
        showNotification(result.error || "Delete failed", "error");
      }
    } catch (error) {
      console.error("Delete error:", error);
      showNotification("Failed to delete PDF", "error");
    }
  };

  // NEW: Search using PDF ID
  const handleSearch = async () => {
    if (!currentPdf || !searchTerm.trim()) return;

    setIsSearching(true);
    try {
      const response = await fetch(`${API_BASE}/api/search-pdf-by-id`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pdf_id: currentPdf.id,
          searchTerm: searchTerm.trim(),
        }),
      });

      const result = await response.json();

      if (result.success) {
        setMatches(result.matches);
        showNotification(
          `Found ${result.totalMatches} instances of "${searchTerm}"`
        );
      } else {
        showNotification(result.error || "Search failed", "error");
      }
    } catch (error) {
      console.error("Search error:", error);
      showNotification("Failed to search PDF", "error");
    } finally {
      setIsSearching(false);
    }
  };

  // NEW: Redact and save using PDF ID
  const handleRedactAndSave = async () => {
    if (!currentPdf || !searchTerm.trim() || matches.length === 0) return;

    setIsProcessing(true);
    try {
      const response = await fetch(`${API_BASE}/api/save-redacted-by-id`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pdf_id: currentPdf.id,
          searchTerm: searchTerm.trim(),
        }),
      });

      const result = await response.json();

      if (result.success) {
        showNotification(
          `Successfully redacted ${result.totalReplacements} instances! New PDF created: ${result.redacted_pdf.filename}`
        );
        setMatches([]);
        setSearchTerm("");
        fetchPdfs(searchQuery, page);
        setView("list");
      } else {
        showNotification(result.error || "Redaction failed", "error");
      }
    } catch (error) {
      console.error("Redaction error:", error);
      showNotification("Failed to redact PDF", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  // NEW: Download redacted PDF
  const handleDownloadRedacted = async () => {
    if (!currentPdf || !searchTerm.trim() || matches.length === 0) return;

    setIsProcessing(true);
    try {
      const response = await fetch(`${API_BASE}/api/download-redacted-by-id`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pdf_id: currentPdf.id,
          searchTerm: searchTerm.trim(),
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.style.display = "none";
        a.href = url;
        a.download = `${currentPdf.original_filename.replace(
          ".pdf",
          ""
        )}_redacted.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        showNotification("Redacted PDF downloaded successfully!");
      } else {
        const error = await response.json();
        showNotification(error.error || "Download failed", "error");
      }
    } catch (error) {
      console.error("Download error:", error);
      showNotification("Failed to download PDF", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleViewPdf = (pdf) => {
    if (pdf.s3_url) {
      window.open(pdf.s3_url, "_blank");
    } else {
      showNotification("PDF URL not available", "error");
    }
  };

  const matchesByPage = matches.reduce((acc, match) => {
    if (!acc[match.page]) {
      acc[match.page] = [];
    }
    acc[match.page].push(match);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-6 py-4 rounded-lg shadow-lg ${
            notification.type === "success"
              ? "bg-green-500 text-white"
              : "bg-red-500 text-white"
          }`}
        >
          {notification.type === "success" ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          <span>{notification.message}</span>
          <button onClick={() => setNotification(null)}>
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-800">
                PDF Redaction Manager
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setView("upload")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  view === "upload"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                <Plus className="w-4 h-4" />
                Upload
              </button>
              <button
                onClick={() => setView("list")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  view === "list"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                <FileText className="w-4 h-4" />
                PDFs
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {view === "upload" && (
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">
              Upload New PDF
            </h2>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-blue-400 transition-colors">
              {selectedFile ? (
                <div className="space-y-4">
                  <FileText className="w-16 h-16 text-blue-500 mx-auto" />
                  <div>
                    <p className="text-lg font-semibold text-gray-700">
                      {selectedFile.name}
                    </p>
                    <p className="text-sm text-gray-500">
                      Size: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-3">
                    <button
                      onClick={handleUpload}
                      disabled={isUploading}
                      className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
                    >
                      <Upload className="w-5 h-5" />
                      {isUploading ? "Uploading..." : "Upload PDF"}
                    </button>
                    <button
                      onClick={() => {
                        setSelectedFile(null);
                        if (fileInputRef.current)
                          fileInputRef.current.value = "";
                      }}
                      className="flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      <X className="w-5 h-5" />
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <Upload className="w-16 h-16 text-gray-400 mx-auto" />
                  <div>
                    <p className="text-xl font-semibold text-gray-700">
                      Drop your PDF here
                    </p>
                    <p className="text-gray-500">or click to browse</p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Upload className="w-5 h-5" />
                    Select PDF File
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {view === "list" && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex gap-3">
                <div className="flex-1">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search PDFs by filename..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    onKeyPress={(e) => e.key === "Enter" && handleSearchPdfs()}
                  />
                </div>
                <button
                  onClick={handleSearchPdfs}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Search className="w-5 h-5" />
                  Search
                </button>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="p-6 border-b">
                <h2 className="text-xl font-bold text-gray-800">
                  All PDFs
                  {pagination && (
                    <span className="ml-2 text-sm font-normal text-gray-500">
                      ({pagination.total_count} total)
                    </span>
                  )}
                </h2>
              </div>

              {pdfs.length === 0 ? (
                <div className="p-12 text-center">
                  <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No PDFs found</p>
                </div>
              ) : (
                <div className="divide-y">
                  {pdfs.map((pdf) => (
                    <div
                      key={pdf.id}
                      className="p-6 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1">
                          <FileText className="w-10 h-10 text-blue-500" />
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-800">
                              {pdf.filename}
                            </h3>
                            <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                              <span>
                                {(pdf.file_size / 1024 / 1024).toFixed(2)} MB
                              </span>
                              <span>
                                {new Date(
                                  pdf.upload_timestamp
                                ).toLocaleDateString()}
                              </span>
                              {pdf.is_redacted && (
                                <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium">
                                  Redacted
                                </span>
                              )}
                              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                                {pdf.storage_type === "s3" ? "S3" : "Local"}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {pdf.s3_url && (
                            <button
                              onClick={() => handleViewPdf(pdf)}
                              className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                            >
                              <Eye className="w-4 h-4" />
                              View
                            </button>
                          )}
                          <button
                            onClick={() => handleEditPdf(pdf)}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                            Redact
                          </button>
                          {/* <button
                            onClick={() => handleDeletePdf(pdf.id)}
                            className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </button> */}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {pagination && pagination.total_pages > 1 && (
                <div className="p-6 border-t bg-gray-50">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => setPage(page - 1)}
                      disabled={!pagination.has_prev}
                      className="px-4 py-2 bg-white border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <span className="text-sm text-gray-600">
                      Page {pagination.page} of {pagination.total_pages}
                    </span>
                    <button
                      onClick={() => setPage(page + 1)}
                      disabled={!pagination.has_next}
                      className="px-4 py-2 bg-white border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {view === "edit" && currentPdf && (
          <div className="space-y-6">
            <button
              onClick={() => {
                setView("list");
                setCurrentPdf(null);
                setMatches([]);
                setSearchTerm("");
              }}
              className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to List
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <div className="lg:col-span-1 space-y-6">
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">
                    PDF Details
                  </h3>
                  <div className="space-y-3 text-sm">
                    <div>
                      <span className="font-medium text-gray-600">Name:</span>
                      <p className="text-gray-800 break-words">
                        {currentPdf.original_filename}
                      </p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Size:</span>
                      <p className="text-gray-800">
                        {(currentPdf.file_size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">
                        Uploaded:
                      </span>
                      <p className="text-gray-800">
                        {new Date(
                          currentPdf.upload_timestamp
                        ).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">ID:</span>
                      <p className="text-gray-800 text-xs font-mono break-all">
                        {currentPdf.id}
                      </p>
                    </div>
                    {currentPdf.s3_url && (
                      <button
                        onClick={() => handleViewPdf(currentPdf)}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                        View PDF in S3
                      </button>
                    )}
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">
                    Search & Redact
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Text to Redact
                      </label>
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Enter text to find..."
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                      />
                    </div>
                    <button
                      onClick={handleSearch}
                      disabled={!searchTerm.trim() || isSearching}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                    >
                      <Search className="w-4 h-4" />
                      {isSearching ? "Searching..." : "Find Text"}
                    </button>
                    {matches.length > 0 && (
                      <div className="space-y-2">
                        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <p className="text-sm font-medium text-yellow-800">
                            Found {matches.length} instances to redact
                          </p>
                        </div>
                        <button
                          onClick={handleDownloadRedacted}
                          disabled={isProcessing}
                          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                        >
                          <Download className="w-4 h-4" />
                          {isProcessing ? "Processing..." : "Download Redacted"}
                        </button>
                        <button
                          onClick={handleRedactAndSave}
                          disabled={isProcessing}
                          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                        >
                          <Shield className="w-4 h-4" />
                          {isProcessing
                            ? "Processing..."
                            : `Save Redacted to S3 (${matches.length})`}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {matches.length > 0 && (
                  <div className="bg-white rounded-xl shadow-lg p-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">
                      Found Matches ({matches.length})
                    </h3>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {Object.entries(matchesByPage).map(
                        ([pageNum, pageMatches]) => (
                          <div key={pageNum} className="border-b pb-2">
                            <div className="text-sm font-medium text-gray-600 mb-2">
                              Page {pageNum} ({pageMatches.length})
                            </div>
                            {pageMatches.map((match, index) => (
                              <div
                                key={`${pageNum}-${index}`}
                                className={`p-3 rounded-lg cursor-pointer transition-colors ${
                                  selectedMatch === match
                                    ? "bg-blue-100 border-2 border-blue-400"
                                    : "bg-gray-50 hover:bg-blue-50"
                                }`}
                                onClick={() => setSelectedMatch(match)}
                              >
                                <div className="text-sm font-mono text-gray-800 break-words">
                                  "{match.text}"
                                </div>
                                {match.context && (
                                  <div className="text-xs text-gray-500 mt-1 break-words">
                                    Context: {match.context}
                                  </div>
                                )}
                                <div className="text-xs text-gray-500 mt-1">
                                  Position: ({Math.round(match.x)},{" "}
                                  {Math.round(match.y)})
                                </div>
                              </div>
                            ))}
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="lg:col-span-3">
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">
                    PDF Information
                  </h3>
                  <div className="border rounded-lg bg-gray-50 p-8">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <FileText className="w-12 h-12 text-blue-500" />
                        <div>
                          <h4 className="font-semibold text-gray-800">
                            {currentPdf.original_filename}
                          </h4>
                          <p className="text-sm text-gray-500">
                            {currentPdf.filename}
                          </p>
                        </div>
                      </div>

                      {currentPdf.s3_url && (
                        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                          <p className="text-sm font-medium text-blue-800 mb-2">
                            S3 URL:
                          </p>
                          <p className="text-xs text-blue-600 break-all font-mono">
                            {currentPdf.s3_url}
                          </p>
                          <button
                            onClick={() => handleViewPdf(currentPdf)}
                            className="mt-3 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                            Open PDF in New Tab
                          </button>
                        </div>
                      )}

                      {matches.length > 0 && (
                        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <h4 className="font-semibold text-yellow-800 mb-2">
                            Redaction Preview
                          </h4>
                          <ul className="text-sm text-yellow-700 space-y-1">
                            <li>
                              • {matches.length} instances of "{searchTerm}"
                              will be redacted
                            </li>
                            <li>
                              • Original text will be covered with black boxes
                            </li>
                            <li>
                              • "CONFIDENTIAL" labels will be placed over
                              redacted areas
                            </li>
                            <li>
                              • New file will be saved as:{" "}
                              {currentPdf.original_filename.replace(".pdf", "")}
                              _redacted_[timestamp]_copy.pdf
                            </li>
                          </ul>
                        </div>
                      )}

                      <div className="mt-4 space-y-2">
                        <h4 className="font-semibold text-gray-800">
                          Instructions:
                        </h4>
                        <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
                          <li>
                            Enter the text you want to redact in the search box
                          </li>
                          <li>Click "Find Text" to locate all instances</li>
                          <li>Review the matches in the sidebar</li>
                          <li>
                            Click "Download Redacted" to download immediately,
                            or
                          </li>
                          <li>
                            Click "Save Redacted to S3" to save to cloud storage
                          </li>
                        </ol>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PDFRedactionApp;
