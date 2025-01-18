#ifndef UTILS_H
#define UTILS_H

size_t send_all(int socket_fd, char *buffer, size_t length);
ssize_t recv_all(int socket_fd, char *buffer, size_t length);
int valid_port(const char *port_str, int *port);
int create_socket();
ssize_t recv_with_error_handling(int socket_fd, char *buffer, size_t buffer_size);

#endif
